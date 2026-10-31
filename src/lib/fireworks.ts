/**
 * Night-sky fireworks for the big moments: a finished celebration, and the day itself.
 *
 * A velvet night veil drops over the app, rockets climb trailing sparks, and shells burst into peonies,
 * willows, rings and crackling stars that cool from white-gold to ember as they fall. Drawn on one
 * transparent canvas with additive light, so it works over the light app. It stands still (and does
 * nothing) for anyone who prefers reduced motion, can be skipped, and never blocks a click.
 *
 * Browser only: import it lazily from an effect so it stays out of the main bundle.
 */
import { playFireworkSound } from "./firework-audio";

export type FireworksScale = "finale" | "eventDay";

export interface FireworksOptions {
  scale?: FireworksScale;
  /** A small line above the caption, e.g. "It's official". */
  kicker?: string;
  /** The words that appear in the sky, e.g. the celebration's name. */
  caption?: string;
  onDone?: () => void;
}

interface Config {
  shells: number;
  seconds: number;
  size: number;
  count: number;
  veil: number;
  volleys: { at: number; shells: number }[];
  confetti: boolean;
}

const CONFIG: Record<FireworksScale, Config> = {
  finale: {
    shells: 15,
    seconds: 8,
    size: 1,
    count: 1,
    veil: 0.8,
    volleys: [{ at: 0.74, shells: 6 }],
    confetti: false,
  },
  eventDay: {
    shells: 30,
    seconds: 13,
    size: 1.3,
    count: 1.4,
    veil: 0.86,
    volleys: [
      { at: 0.4, shells: 5 },
      { at: 0.8, shells: 9 },
    ],
    confetti: true,
  },
};

const PALETTES: string[][] = [
  ["#ffd98a"],
  ["#ff4d6d"],
  ["#f6e7c1"],
  ["#ffb347", "#ff4d6d"],
  ["#ffd98a", "#ffffff"],
  ["#d4a5ff"],
  ["#7fe0b0"],
  ["#8ec5ff"],
];
const EMBER = "#ff7a2a";

type Kind = "peony" | "willow" | "ring" | "crackle";

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  drag: number;
  gravity: number;
  life: number;
  age: number;
  size: number;
  color: string;
  cool: boolean;
  twinkle: boolean;
  pop: boolean;
}

interface Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  kind: Kind;
  palette: string[];
  power: number;
}

interface Flash {
  x: number;
  y: number;
  r: number;
  age: number;
  life: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function sprite(color: string, cache: Map<string, HTMLCanvasElement>) {
  let c = cache.get(color);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = c.height = 48;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.18, color);
    grad.addColorStop(0.5, `${color}66`);
    grad.addColorStop(1, `${color}00`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 48, 48);
  }
  cache.set(color, c);
  return c;
}

/** Starts the show. Returns a function that ends it early. */
export function startFireworks(options: FireworksOptions = {}): () => void {
  if (typeof window === "undefined") return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return () => {};

  const cfg = CONFIG[options.scale ?? "finale"];
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = window.innerWidth;
  let h = window.innerHeight;
  const unit = () => Math.min(Math.max(Math.min(w, h * 1.4) / 900, 0.55), 1.7);

  // ---- the stage: night veil, canvas, caption, skip ----
  const root = document.createElement("div");
  root.setAttribute("data-testid", "fireworks");
  root.style.cssText =
    "position:fixed;inset:0;z-index:90;pointer-events:none;overflow:hidden";
  const veil = document.createElement("div");
  veil.style.cssText = `position:absolute;inset:0;opacity:0;transition:opacity 900ms ease;background:radial-gradient(120% 90% at 50% 100%, #2a0a14 0%, #12040a 55%, #07020a 100%)`;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
  root.append(veil, canvas);

  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.style.cssText =
    "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap";
  status.textContent = options.caption
    ? `Fireworks for ${options.caption}`
    : "Fireworks to celebrate";
  root.append(status);

  if (options.kicker || options.caption) {
    const cap = document.createElement("div");
    cap.setAttribute("aria-hidden", "true");
    cap.style.cssText =
      "position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);padding:0 24px;text-align:center;opacity:0;transition:opacity 1200ms ease;color:#f6e7c1;text-shadow:0 2px 30px rgba(7,2,10,.9)";
    const kick = options.kicker
      ? `<div style="font:600 11px/1 var(--font-sans),system-ui,sans-serif;letter-spacing:.34em;text-transform:uppercase;color:#e9c98a;margin-bottom:14px">${escape(options.kicker)}</div>`
      : "";
    const title = options.caption
      ? `<div style="font-family:var(--font-display),Georgia,serif;font-weight:700;font-size:clamp(1.7rem,5.2vw,3.6rem);line-height:1.1;overflow-wrap:anywhere">${escape(options.caption)}</div>`
      : "";
    cap.innerHTML = kick + title;
    root.append(cap);
    window.setTimeout(() => (cap.style.opacity = "1"), 900);
    window.setTimeout(
      () => (cap.style.opacity = "0"),
      cfg.seconds * 1000 * 0.62
    );
  }

  const skip = document.createElement("button");
  skip.type = "button";
  skip.textContent = "Skip";
  skip.style.cssText =
    "position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));pointer-events:auto;min-height:44px;padding:0 20px;border-radius:999px;border:1px solid rgba(233,201,138,.5);background:rgba(18,4,10,.6);color:#f6e7c1;font:600 11px/1 var(--font-sans),system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;cursor:pointer";
  root.append(skip);
  document.body.append(root);
  requestAnimationFrame(() => (veil.style.opacity = String(cfg.veil)));

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    root.remove();
    return () => {};
  }
  const size = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  window.addEventListener("resize", size);

  // ---- the show ----
  const sprites = new Map<string, HTMLCanvasElement>();
  const rockets: Rocket[] = [];
  const sparks: Spark[] = [];
  const flashes: Flash[] = [];
  let queue = cfg.shells;
  let nextShell = 500;
  let elapsed = 0;
  let last = performance.now();
  let raf = 0;
  let ending = false;
  let finished = false;
  const volleys = cfg.volleys.map((v) => ({ ...v, done: false }));
  const MAX_SPARKS = 4200;

  const launch = (power = 1, atX?: number) => {
    playFireworkSound("launch");
    const u = unit();
    const kind: Kind = pick(["peony", "peony", "willow", "ring", "crackle"]);
    const x = atX ?? rand(w * 0.12, w * 0.88);
    const targetY = rand(h * 0.14, h * 0.46);
    const frames = rand(44, 62);
    rockets.push({
      x,
      y: h + 8,
      vx: rand(-0.7, 0.7) * u,
      vy: -(h + 8 - targetY) / frames,
      targetY,
      kind,
      palette: kind === "willow" ? ["#ffd98a"] : pick(PALETTES),
      power,
    });
  };

  const addSpark = (
    s: Partial<Spark> & Pick<Spark, "x" | "y" | "vx" | "vy" | "color">
  ) => {
    if (sparks.length >= MAX_SPARKS) return;
    sparks.push({
      drag: 0.976,
      gravity: 0.04,
      life: 80,
      age: 0,
      size: 1,
      cool: false,
      twinkle: false,
      pop: false,
      ...s,
    });
  };

  const burst = (r: Rocket) => {
    playFireworkSound("burst");
    const u = unit();
    const big = cfg.size * r.power;
    const base =
      (r.kind === "willow" ? 140 : 200) * cfg.count * (0.85 + r.power * 0.15);
    const speed = (r.kind === "willow" ? 4.6 : 6.4) * u * big;
    flashes.push({ x: r.x, y: r.y, r: 260 * u * big, age: 0, life: 26 });
    const tilt = rand(0.25, 0.9);
    const rot = rand(0, Math.PI);
    const n = Math.round(r.kind === "ring" ? base * 0.55 : base);
    for (let i = 0; i < n; i++) {
      const color = pick(r.palette);
      let vx: number;
      let vy: number;
      if (r.kind === "ring") {
        const a = (i / n) * Math.PI * 2;
        const rx = Math.cos(a) * speed;
        const ry = Math.sin(a) * speed * tilt;
        vx = rx * Math.cos(rot) - ry * Math.sin(rot);
        vy = rx * Math.sin(rot) + ry * Math.cos(rot);
      } else {
        const a = Math.random() * Math.PI * 2;
        const m = speed * Math.sqrt(rand(0.12, 1));
        vx = Math.cos(a) * m;
        vy = Math.sin(a) * m;
      }
      addSpark({
        x: r.x,
        y: r.y,
        vx,
        vy,
        color,
        drag: r.kind === "willow" ? 0.986 : 0.975,
        gravity: (r.kind === "willow" ? 0.052 : 0.04) * u,
        life: r.kind === "willow" ? rand(130, 190) : rand(62, 96),
        size: rand(0.8, 1.35) * (r.kind === "willow" ? 0.9 : 1) * Math.sqrt(u),
        cool: color === "#ffd98a" || color === "#f6e7c1" || color === "#ffb347",
        twinkle: r.kind !== "ring" && Math.random() < 0.55,
        pop: r.kind === "crackle" && Math.random() < 0.16,
      });
    }
  };

  const confetti = async () => {
    try {
      const mod = await import("canvas-confetti");
      const fire = mod.default;
      const colors = ["#e9c98a", "#f6dca8", "#c1283d", "#6e1426", "#f4efe6"];
      const shared = {
        colors,
        zIndex: 95,
        ticks: 320,
        disableForReducedMotion: true,
      };
      const end = Date.now() + 2600;
      const frame = () => {
        fire({
          ...shared,
          particleCount: 6,
          angle: 60,
          spread: 70,
          startVelocity: 62,
          origin: { x: 0, y: 0.85 },
        });
        fire({
          ...shared,
          particleCount: 6,
          angle: 120,
          spread: 70,
          startVelocity: 62,
          origin: { x: 1, y: 0.85 },
        });
        if (Date.now() < end && !finished) requestAnimationFrame(frame);
      };
      frame();
    } catch {
      /* the fireworks are enough */
    }
  };
  if (cfg.confetti) window.setTimeout(() => void confetti(), 300);

  const step = (now: number) => {
    const ms = Math.min(now - last, 64);
    last = now;
    const dt = ms / 16.667;
    elapsed += ms;

    if (!ending) {
      if (queue > 0 && elapsed >= nextShell) {
        launch(rand(0.9, 1.15));
        queue--;
        nextShell = elapsed + rand(260, 640) * (cfg.seconds / 8) * 0.6;
      }
      for (const v of volleys) {
        if (!v.done && elapsed >= v.at * cfg.seconds * 1000) {
          v.done = true;
          for (let i = 0; i < v.shells; i++) {
            const at = w * (0.1 + (0.8 * (i + rand(0.1, 0.9))) / v.shells);
            window.setTimeout(() => launch(1.2, at), i * 120);
          }
        }
      }
      if (
        elapsed >= cfg.seconds * 1000 &&
        queue === 0 &&
        volleys.every((v) => v.done)
      )
        ending = true;
    }

    // clear to transparent a little at a time, which is what leaves the trails
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";

    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      for (let k = 0; k < 2; k++)
        addSpark({
          x: r.x + rand(-1.5, 1.5),
          y: r.y,
          vx: rand(-0.4, 0.4),
          vy: rand(0.4, 1.6),
          color: "#ffb347",
          drag: 0.94,
          gravity: 0.02,
          life: rand(14, 26),
          size: rand(0.5, 0.9),
        });
      ctx.globalAlpha = 1;
      ctx.drawImage(sprite("#fff3d6", sprites), r.x - 7, r.y - 7, 14, 14);
      if (r.y <= r.targetY) {
        burst(r);
        rockets.splice(i, 1);
      }
    }

    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.age += dt;
      if (f.age >= f.life) {
        flashes.splice(i, 1);
        continue;
      }
      const t = f.age / f.life;
      const grad = ctx.createRadialGradient(
        f.x,
        f.y,
        0,
        f.x,
        f.y,
        f.r * (0.4 + t * 0.6)
      );
      grad.addColorStop(0, `rgba(255,240,205,${0.42 * (1 - t)})`);
      grad.addColorStop(1, "rgba(255,200,120,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.age += dt;
      if (s.age >= s.life) {
        if (s.pop) {
          for (let k = 0; k < 4; k++)
            addSpark({
              x: s.x,
              y: s.y,
              vx: rand(-2.4, 2.4),
              vy: rand(-2.4, 2.4),
              color: "#ffffff",
              life: rand(8, 14),
              size: 0.7,
              gravity: 0.02,
            });
        }
        sparks.splice(i, 1);
        continue;
      }
      const d = Math.pow(s.drag, dt);
      s.vx *= d;
      s.vy = s.vy * d + s.gravity * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const t = s.age / s.life;
      let a = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      if (s.twinkle) a *= 0.55 + 0.45 * Math.sin(s.age * 1.9 + s.x);
      ctx.globalAlpha = Math.max(a, 0);
      const color = s.cool && t > 0.55 ? EMBER : s.color;
      const px = 7 * s.size * (1 - t * 0.35);
      ctx.drawImage(sprite(color, sprites), s.x - px, s.y - px, px * 2, px * 2);
    }
    ctx.globalAlpha = 1;

    if (
      ending &&
      rockets.length === 0 &&
      sparks.length === 0 &&
      flashes.length === 0
    ) {
      finish();
      return;
    }
    raf = requestAnimationFrame(step);
  };

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", size);
    window.removeEventListener("keydown", onKey);
    veil.style.transition = "opacity 1100ms ease";
    veil.style.opacity = "0";
    canvas.style.transition = "opacity 700ms ease";
    canvas.style.opacity = "0";
    skip.remove();
    window.setTimeout(() => {
      root.remove();
      options.onDone?.();
    }, 1200);
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") finish();
  };
  window.addEventListener("keydown", onKey);
  skip.addEventListener("click", finish);

  raf = requestAnimationFrame((t) => {
    last = t;
    raf = requestAnimationFrame(step);
  });
  return finish;
}

function escape(text: string): string {
  return text.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;"
  );
}
