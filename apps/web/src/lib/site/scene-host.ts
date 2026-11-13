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

/**
 * Software renderers (SwiftShader, llvmpipe, "Microsoft Basic Render Driver") draw the hall on the
 * CPU, a frame at a time, so the main thread never goes idle. That is how PageSpeed's headless
 * Chrome, a phone with no GPU access and a remote desktop all run, and the page then looks
 * frozen, or PageSpeed gives up on it. They get the film without the 3D hall instead.
 */
export function isSoftwareRenderer(name: string): boolean {
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
}

function canRender3d(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? "")
      : "";
    if (isSoftwareRenderer(renderer)) return false;
  } catch {
    return false;
  }
  const saveData = (
    navigator as unknown as { connection?: { saveData?: boolean } }
  ).connection?.saveData;
  return !saveData;
}

/** Runs `fn` after the page's load event, then at the next idle moment (at most 1.5 s later). */
function whenQuiet(fn: () => void) {
  const idle = () => {
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void;
    };
    if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 1500 });
    else setTimeout(fn, 200);
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
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
  let scheduled = false;

  host = {
    canvas,
    op,
    now: () => (performance.now() - t0) / 1000,
    adopt(el) {
      // The module looks #gl up by id when it evaluates, so the canvas has to be
      // in the page before the script is appended.
      if (canvas.parentElement !== el) el.appendChild(canvas);
      if (script || scheduled) return;
      // The module is large and builds the whole hall when it evaluates, so it starts once the
      // page has painted and the browser has a quiet moment, never in the way of first paint.
      scheduled = true;
      whenQuiet(() => {
        script = document.createElement("script");
        script.type = "module";
        script.src = SCENE_URL;
        script.async = true;
        document.body.appendChild(script);
      });
    },
  };

  return host;
}
