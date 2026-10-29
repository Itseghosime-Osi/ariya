"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { ChairType, Centrepiece, HallLayout, TableTop } from "./model";

/** What the 3D hall needs to draw one table. */
export interface SceneTable {
  id: string;
  name: string;
  shape: string;
  capacity: number;
  occupied: number;
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
}

export type PickType = "table" | "zone" | "chair";
export interface Pick {
  type: PickType;
  id: string;
}

export interface Scene {
  layout: HallLayout;
  tables: SceneTable[];
  chairs: SceneChair[];
  selection: Pick[];
  tool: "select" | "hand";
  labels: boolean;
  warnings: Record<string, string>;
  ghosts: { x: number; y: number; rot: number; top: TableTop }[];
  assigning: boolean;
}

export type HallCommand =
  | "zoomIn"
  | "zoomOut"
  | "fit"
  | "top"
  | "perspective"
  | "rotateLeft"
  | "rotateRight"
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
  pct?: number;
  view?: "top" | "3d";
}

export interface Hall3DHandle {
  command: (cmd: HallCommand) => void;
  focus: (key: string) => void;
}

/**
 * The bridge to the 3D hall, which runs as its own page (public/hall3d) so three.js never lands
 * in the app bundle. The scene goes in by postMessage; picks, moves and keys come back.
 */
export const Hall3D = forwardRef<
  Hall3DHandle,
  { scene: Scene; onMessage: (m: HallMessage) => void; className?: string }
>(function Hall3D({ scene, onMessage, className }, ref) {
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
      else if (m.t === "wheel") {
        // The hall never zooms on scroll; the page scrolls instead.
        window.scrollBy({ left: 0, top: m.dy ?? 0 });
      } else handler.current(m);
    };
    window.addEventListener("message", listen);
    // The hall may have finished loading before this page hydrated; ask it again.
    send({ t: "hello" });
    return () => window.removeEventListener("message", listen);
  }, [send]);

  useEffect(() => {
    if (ready) send({ t: "scene", ...scene });
  }, [ready, scene, send]);

  return (
    <div className={className}>
      <iframe
        ref={frame}
        src="/hall3d/index.html"
        title="3D hall: drag tables, chairs and areas to arrange the room"
        className="block h-full w-full border-0"
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
