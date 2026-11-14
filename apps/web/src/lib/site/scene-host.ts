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
  /** True once the hall was switched off because this device could not keep up with it. */
  readonly degraded: boolean;
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

/**
 * Phones too weak to draw the hall at a watchable frame rate: the scene is a full cinematic
 * pipeline (multisampled HDR, depth of field, bloom, ambient occlusion, anti-aliasing), so a
 * budget GPU stutters at any resolution. They get the film without the hall instead.
 * Returns why, or null when the device can try the hall (a runtime check still protects it).
 */
export function lowEndReason(device: {
  memoryGb?: number;
  cores?: number;
  renderer?: string;
}): string | null {
  const { memoryGb, cores, renderer = "" } = device;
  if (memoryGb !== undefined && memoryGb <= 2) return "memory";
  if (
    memoryGb !== undefined &&
    memoryGb <= 4 &&
    cores !== undefined &&
    cores <= 4
  )
    return "cpu";
  // Older and entry-level mobile GPUs: PowerVR, Mali-400/T/G31/G51/G52/G71, Adreno 2xx to 5xx and 610/612.
  if (
    /PowerVR|Mali-(4\d\d|T\d+|G31|G51|G52|G71)\b|Adreno \(TM\) ?([2-5]\d\d|60\d|61[0-2])\b/i.test(
      renderer
    )
  )
    return "gpu";
  return null;
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
    const nav = navigator as unknown as {
      deviceMemory?: number;
      hardwareConcurrency?: number;
    };
    if (
      lowEndReason({
        memoryGb: nav.deviceMemory,
        cores: nav.hardwareConcurrency,
        renderer,
      })
    )
      return false;
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
  let degraded = false;

  /**
   * A safety net for devices that pass the checks above and still cannot keep up. The scene
   * lowers its own resolution when frames run long, so this only steps in when that is not
   * enough: under about 10 frames a second for 2.5 s, or under about 22 frames a second for 4 s
   * once the scene is already at its lowest resolution. The hall is then switched off and the
   * film carries on without it, rather than stutter.
   */
  function watchFrameRate() {
    let last = 0;
    let avg = 16;
    let started = 0;
    let verySlowSince = 0;
    let slowSince = 0;
    const off = () => {
      degraded = true;
      canvas.style.display = "none";
      document.documentElement.setAttribute("data-scene", "off");
    };
    const tick = (now: number) => {
      if (degraded) return;
      requestAnimationFrame(tick);
      if (document.hidden) {
        last = 0;
        verySlowSince = slowSince = 0;
        return;
      }
      if (last) {
        const dt = now - last;
        if (dt > 0 && dt < 1500) avg = avg * 0.8 + dt * 0.2;
      }
      last = now;
      if ((Number(op.loaded) || 0) < 1) return;
      started ||= now;
      if (now - started < 3000) return; // let the first seconds settle
      const info = op.frameInfo as { pixelRatio?: number } | undefined;
      const atFloor = info?.pixelRatio !== undefined && info.pixelRatio <= 0.75;
      verySlowSince = avg > 100 ? verySlowSince || now : 0;
      slowSince = atFloor && avg > 45 ? slowSince || now : 0;
      if (
        (verySlowSince && now - verySlowSince > 2500) ||
        (slowSince && now - slowSince > 4000)
      )
        off();
    };
    requestAnimationFrame(tick);
  }

  host = {
    canvas,
    op,
    now: () => (performance.now() - t0) / 1000,
    get degraded() {
      return degraded;
    },
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
        watchFrameRate();
      });
    },
  };

  return host;
}
