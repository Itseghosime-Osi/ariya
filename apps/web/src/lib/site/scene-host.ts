/**
 * The one owner of the archive's scene module.
 *
 * The module is a document singleton: it captures `window.OP` and `#gl` once,
 * when it evaluates, and the module registry caches by URL, so a second
 * <script type="module"> with the same src never re-evaluates. Both the film and
 * /about's bands therefore have to talk to the same OP object and drive the same
 * canvas; this module is that one owner, created on first use and outliving
 * every React mount.
 */
import { bump, clamp, seg, smooth } from "@/components/film/story";
import { SCENE_URL } from "./scene";

export interface SceneHost {
  /** The one #gl canvas. Re-parenting it keeps its WebGL context. */
  readonly canvas: HTMLCanvasElement;
  /** The handshake object the module captured at evaluation. */
  readonly op: Record<string, unknown>;
  /** Seconds since the module's document loaded; never rewinds across mounts. */
  now(): number;
  /** Points the canvas at `el`, loading the module the first time it is asked. */
  adopt(el: HTMLElement): void;
}

function canRender3d(): boolean {
  try {
    if (!document.createElement("canvas").getContext("webgl2")) return false;
  } catch {
    return false;
  }
  const saveData = (
    navigator as unknown as { connection?: { saveData?: boolean } }
  ).connection?.saveData;
  return !saveData;
}

export function velvetHint(): string {
  const v = document.documentElement.getAttribute("data-cotd");
  return v === "ruby" || v === "coral" ? v : "burgundy";
}

let host: SceneHost | null = null;
let unsupported = false;

export function sceneHost(): SceneHost | null {
  if (host) return host;
  if (unsupported) return null;
  if (!canRender3d()) {
    unsupported = true;
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.id = "gl";
  canvas.setAttribute("aria-hidden", "true");

  // A stable viewport height: innerHeight changes whenever a phone's address
  // bar slides, which made the scene jump.
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none";
  document.documentElement.appendChild(probe);

  let vh = 0;
  window.addEventListener("resize", () => {
    vh = 0;
  });

  const op: Record<string, unknown> = {
    loaded: 0,
    failed: false,
    render: null,
    vh: () => vh || (vh = probe.offsetHeight || window.innerHeight),
    velvet: velvetHint(),
    embed: null,
    entered: false,
    paused: false,
    covered: false,
    blackout: 0,
    gateLoop: false,
    seated: 0,
    // The module reads this once, at evaluation, so it has to be settled before
    // the script is appended.
    reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    raw: 0,
    pro: 0,
    p: 0,
    s: 0,
    scene: { mode: "old", local: 0, fade: 0, vis: 1 },
    clamp,
    seg,
    bump,
    smooth,
  };
  // The module captured window.OP at evaluation, so this write is the only one
  // that can ever take effect.
  (window as unknown as { OP: unknown }).OP = op;

  // The module latches its intro clock from this value and compares it against
  // every later frame, so it has to be one monotonic origin for the document —
  // a per-mount clock makes `t - tStart` negative and pins the lens at full blur.
  const t0 = performance.now();

  let script: HTMLScriptElement | null = null;

  host = {
    canvas,
    op,
    now: () => (performance.now() - t0) / 1000,
    adopt(el) {
      // The module looks #gl up by id when it evaluates, so the canvas has to be
      // in the page before the script is appended.
      if (canvas.parentElement !== el) el.appendChild(canvas);
      if (script) return;
      script = document.createElement("script");
      script.type = "module";
      script.src = SCENE_URL;
      script.async = true;
      document.body.appendChild(script);
    },
  };

  return host;
}
