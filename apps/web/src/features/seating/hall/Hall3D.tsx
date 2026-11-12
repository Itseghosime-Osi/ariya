"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type {
  ChairType,
  Centrepiece,
  HallLayout,
  StageItem,
  StageItemAt,
  TableTop,
} from "./model";

/** What the 3D hall needs to draw one table. */
export interface SceneTable {
  id: string;
  name: string;
  shape: string;
  capacity: number;
  /** People seated, or null when the plan carries no seating (a shared plan, a proposal). */
  occupied: number | null;
  x: number;
  y: number;
  rot: number;
  top: TableTop;
  chairs: { x: number; y: number }[];
  style: {
    cloth: string;
    chair: ChairType;
    cover: string;
    sash: string | null;
    centrepiece: Centrepiece;
    flower: string;
  };
}

export interface SceneChair {
  id: string;
  x: number;
  y: number;
  rot: number;
  type: ChairType;
  cover: string;
  sash: string | null;
  /** A couch draws as a couch; the rest draw as chairs. */
  seat?: "guest" | "couple" | "celebrant" | "couch";
}

export type PickType = "table" | "zone" | "chair" | "ac";
export interface Pick {
  type: PickType;
  id: string;
}

/** One air conditioner, as the 3D hall draws it. */
export interface SceneUnit {
  id: string;
  x: number;
  y: number;
  hp: number;
  mount: "wall" | "cassette" | "floor";
  inverter: boolean;
}

export interface Scene {
  layout: HallLayout;
  tables: SceneTable[];
  chairs: SceneChair[];
  /** Fixtures on stages, already placed in room metres by `stageItemPlacement`. */
  stageItems: (StageItem & StageItemAt)[];
  selection: Pick[];
  tool: "select" | "hand";
  labels: boolean;
  warnings: Record<string, string>;
  ghosts: { x: number; y: number; rot: number; top: TableTop }[];
  assigning: boolean;
  /** The page background, which the daytime board takes on so the hall sits on the page. */
  board: string;
  /** Pixels of the full-screen hall covered on each side by the page's bars and panels. */
  inset: { left: number; top: number; right: number; bottom: number };
  /** The units the host has placed, drawn where they sit. */
  units?: SceneUnit[];
  /** The heat map, when the engine has one. Absent means nothing to paint. */
  field?: {
    cell: number;
    cols: number;
    rows: number;
    temps: number[];
    minC: number;
    maxC: number;
    meanC: number;
  } | null;
  /** Whether the heat map is painted on the floor. */
  heat?: boolean;
  /** Whether the next floor click places a unit. */
  placing?: boolean;
  /** How solid a tent roof is drawn, from 0 (hidden) to 1. */
  roof?: number;
}

export type HallCommand =
  | "zoomIn"
  | "zoomOut"
  | "fit"
  | "top"
  | "perspective"
  | "rotateLeft"
  | "rotateRight"
  | "tiltUp"
  | "tiltDown"
  | "rain"
  | "snapshot";

export interface HallMessage {
  t: string;
  items?: (Pick & { x?: number; y?: number })[];
  type?: PickType;
  id?: string;
  rot?: number;
  key?: string;
  shift?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
  dx?: number;
  dy?: number;
  /** A floor point, in metres, for a placement. */
  x?: number;
  y?: number;
  /** An area to frame, in metres, with the height of its top surface. */
  at?: { x: number; y: number; w: number; h: number; height: number };
  pct?: number;
  view?: "top" | "3d";
  /** Whether the rain is falling, reported back after a `rain` command. */
  on?: boolean;
}

export interface Hall3DHandle {
  command: (cmd: HallCommand) => void;
  focus: (key: string) => void;
  /** Light up one object (or none) as if the pointer were over it. */
  hover: (key: string | null) => void;
  /** Frame an area of the hall at its own height, so a stage's top is what you look at. */
  frame: (at: {
    x: number;
    y: number;
    w: number;
    h: number;
    height: number;
  }) => void;
}

/**
 * The bridge to the 3D hall, which runs as its own page (public/hall3d) so three.js never lands
 * in the app bundle. The scene goes in by postMessage; picks, moves and keys come back.
 */
export const Hall3D = forwardRef<
  Hall3DHandle,
  {
    scene: Scene;
    onMessage: (m: HallMessage) => void;
    className?: string;
    /**
     * The camera to settle on once the room is drawn. `top` is a true plan view: the same hall,
     * read from above, which is what a host comparing two designs needs.
     */
    initialView?: "top" | "3d";
  }
>(function Hall3D({ scene, onMessage, className, initialView }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const handler = useRef(onMessage);
  handler.current = onMessage;

  const send = useCallback((msg: object) => {
    frame.current?.contentWindow?.postMessage(
      { source: "ariya-studio", ...msg },
      window.location.origin
    );
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      command: (cmd) => send({ t: "cmd", cmd }),
      focus: (key) => send({ t: "cmd", cmd: "focus", key }),
      hover: (key) => send({ t: "cmd", cmd: "hover", key }),
      frame: (at) => send({ t: "cmd", cmd: "frame", at }),
    }),
    [send]
  );

  useEffect(() => {
    const listen = (e: MessageEvent) => {
      if (
        e.origin !== window.location.origin ||
        e.source !== frame.current?.contentWindow
      )
        return;
      const m = e.data as HallMessage & { source?: string };
      if (!m || m.source !== "ariya-hall3d") return;
      if (m.t === "ready") setReady(true);
      else if (m.t === "error") setFailed(true);
      // Scrolling over the hall does nothing: the studio page itself never scrolls.
      else if (m.t !== "wheel") handler.current(m);
    };
    window.addEventListener("message", listen);
    // The hall may have finished loading before this page hydrated; ask it again.
    send({ t: "hello" });
    return () => window.removeEventListener("message", listen);
  }, [send]);

  useEffect(() => {
    if (!ready) return;
    send({ t: "scene", ...scene });
    // The scene is applied before the next message is read, so the view lands on the room it names.
    if (initialView === "top") send({ t: "cmd", cmd: "top" });
  }, [ready, scene, initialView, send]);

  return (
    <div className={className}>
      <iframe
        ref={frame}
        src="/hall3d/index.html"
        title="3D hall: drag tables, chairs and areas to arrange the room"
        className="block h-full w-full border-0 bg-transparent [color-scheme:normal]"
        onLoad={() => send({ t: "hello" })}
      />
      {!ready && !failed && (
        <div
          className="pointer-events-none absolute inset-0 grid place-items-center"
          aria-hidden="true"
        >
          <div className="flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-label-2 shadow">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-burgundy border-t-transparent motion-reduce:animate-none" />
            Building your hall…
          </div>
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-ivory p-6 text-center text-sm text-night">
          This device cannot draw the 3D hall. You can still seat everyone from
          the Guests panel or the table list.
        </div>
      )}
    </div>
  );
});
