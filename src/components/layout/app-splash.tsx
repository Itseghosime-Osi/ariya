"use client";

import { useEffect, useRef, useState } from "react";

/** Set on <html> before the first paint when the installed app is launching. */
const FLAG = "data-splash";
/** The splash stays up at least this long from launch, so it reads as a moment, not a flicker. */
const MIN_MS = 2400;
/** Once the page can respond, there is always this long to play with the petals. */
const PLAY_MS = 1800;
/** While someone is still playing, it waits up to this long after the page can respond. */
const MAX_PLAY_MS = 4000;
const LEAVE_MS = 650;

/**
 * Runs before the page paints. Opened from the home screen (or with ?splash in the address bar,
 * to preview it), it marks <html> so the splash shows from the very first frame. It plays once per
 * launch: sessionStorage starts empty each time the installed app opens.
 */
export const splashScript = `try{var q=/[?&]splash\\b/.test(location.search),s=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;if(q||(s&&!sessionStorage.getItem("ariya:splash"))){sessionStorage.setItem("ariya:splash","1");document.documentElement.setAttribute("${FLAG}","")}}catch(e){}`;

/** A Yoruba greeting for the hour in Lagos, with its English. */
function greeting(): [string, string] {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Africa/Lagos",
    }).format(new Date())
  );
  if (hour >= 4 && hour < 12) return ["Ẹ káàárọ̀", "Good morning"];
  if (hour >= 12 && hour < 16) return ["Ẹ káàsán", "Good afternoon"];
  return ["Ẹ kú ìrọ̀lẹ́", "Good evening"];
}

const PETALS = [
  "#8a1c36",
  "#a8324f",
  "#c9566e",
  "#e9a3b0",
  "#f1d9a0",
  "#d7ae62",
];

interface Bit {
  kind: "petal" | "spark";
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  spin: number;
  life: number;
  ttl: number;
  color: string;
  sway: number;
}

/**
 * Petals drift down over the splash; a finger leaves a trail of gold sparks and a tap throws a
 * burst of petals. Returns a stop function.
 */
function celebrate(
  canvas: HTMLCanvasElement,
  seal: HTMLElement,
  onTouch: () => void
) {
  const g = canvas.getContext("2d");
  if (!g) return () => {};
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let w = 0;
  let h = 0;
  const size = () => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  const bits: Bit[] = [];
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const petal = (x: number, y: number, burst = false): Bit => {
    const a = Math.random() * Math.PI * 2;
    const speed = burst ? 2 + Math.random() * 5 : 0;
    return {
      kind: "petal",
      x,
      y,
      vx: burst ? Math.cos(a) * speed : (Math.random() - 0.5) * 0.4,
      vy: burst ? Math.sin(a) * speed - 2 : 0.6 + Math.random() * 0.9,
      r: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.08,
      life: 0,
      ttl: burst ? 140 + Math.random() * 60 : 600,
      color: pick(PETALS),
      sway: Math.random() * Math.PI * 2,
    };
  };
  const spark = (x: number, y: number, power = 1): Bit => {
    const a = Math.random() * Math.PI * 2;
    const speed = (0.5 + Math.random() * 2.5) * power;
    return {
      kind: "spark",
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      r: 1 + Math.random() * 2,
      rot: 0,
      spin: 0,
      life: 0,
      ttl: 40 + Math.random() * 40,
      color: Math.random() < 0.5 ? "#fff1c9" : "#e2bb6c",
      sway: 0,
    };
  };
  for (let i = 0; i < 26; i++) {
    const b = petal(Math.random() * w, -20 - Math.random() * h);
    bits.push(b);
  }

  let last = 0;
  const move = (e: PointerEvent) => {
    const now = performance.now();
    // The seal leans towards the finger.
    const dx = (e.clientX / w - 0.5) * 2;
    const dy = (e.clientY / h - 0.5) * 2;
    seal.style.setProperty("--tilt-x", `${(-dy * 14).toFixed(1)}deg`);
    seal.style.setProperty("--tilt-y", `${(dx * 14).toFixed(1)}deg`);
    if (now - last > 16) {
      last = now;
      for (let i = 0; i < 3; i++) bits.push(spark(e.clientX, e.clientY, 0.6));
    }
    onTouch();
  };
  const tap = (e: PointerEvent) => {
    for (let i = 0; i < 18; i++) bits.push(petal(e.clientX, e.clientY, true));
    for (let i = 0; i < 26; i++) bits.push(spark(e.clientX, e.clientY, 1.6));
    seal.classList.remove("is-pulse");
    void seal.offsetWidth;
    seal.classList.add("is-pulse");
    navigator.vibrate?.(12);
    onTouch();
  };
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerdown", tap);
  window.addEventListener("resize", size);

  let raf = 0;
  const frame = () => {
    g.clearRect(0, 0, w, h);
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.life++;
      if (b.kind === "petal") {
        b.sway += 0.03;
        b.vx *= 0.97;
        b.vy = b.vy * 0.97 + 0.04;
        b.x += b.vx + Math.sin(b.sway) * 0.6;
        b.y += b.vy;
        b.rot += b.spin;
        // Falling petals loop back to the top for as long as the splash is up.
        if (b.ttl === 600 && b.y > h + 20) {
          b.y = -20;
          b.x = Math.random() * w;
        }
        const fade = Math.min(1, (b.ttl - b.life) / 30);
        g.save();
        g.globalAlpha = Math.max(0, fade) * 0.9;
        g.translate(b.x, b.y);
        g.rotate(b.rot);
        g.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(b.sway * 1.7)));
        g.fillStyle = b.color;
        g.beginPath();
        g.moveTo(0, -b.r);
        g.bezierCurveTo(b.r, -b.r * 0.6, b.r * 0.8, b.r * 0.7, 0, b.r);
        g.bezierCurveTo(-b.r * 0.8, b.r * 0.7, -b.r, -b.r * 0.6, 0, -b.r);
        g.fill();
        g.restore();
      } else {
        b.vx *= 0.94;
        b.vy = b.vy * 0.94 + 0.03;
        b.x += b.vx;
        b.y += b.vy;
        const a = 1 - b.life / b.ttl;
        g.globalAlpha = Math.max(0, a);
        g.fillStyle = b.color;
        g.shadowColor = "#f6d58a";
        g.shadowBlur = 8;
        g.beginPath();
        g.arc(b.x, b.y, b.r * (0.5 + a * 0.5), 0, Math.PI * 2);
        g.fill();
        g.shadowBlur = 0;
      }
      if (b.life >= b.ttl) bits.splice(i, 1);
    }
    g.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerdown", tap);
    window.removeEventListener("resize", size);
  };
}

/**
 * The launch screen of the installed app: the Àríyá seal and a greeting for the time of day, with
 * petals falling, gold sparks under your finger and a burst of petals wherever you tap. It then
 * lifts away to reveal the app. Hidden by CSS unless the launch script marked the page, and it
 * fades on its own should the app never finish loading.
 */
export function AppSplash() {
  const [state, setState] = useState<"show" | "leaving" | "gone">("show");
  const [hello, setHello] = useState<[string, string] | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const seal = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    if (!html.hasAttribute(FLAG)) {
      setState("gone");
      return;
    }
    setHello(greeting());
    let touched = 0;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stop =
      !still && canvas.current && seal.current
        ? celebrate(canvas.current, seal.current, () => {
            touched = performance.now();
          })
        : () => {};
    let timer: ReturnType<typeof setTimeout>;
    const ready = performance.now();
    const check = () => {
      const now = performance.now();
      const played = now - ready;
      // Someone still playing gets a moment longer, but never past MAX_PLAY_MS.
      if (
        now < MIN_MS ||
        played < PLAY_MS ||
        (now - touched < 700 && played < MAX_PLAY_MS)
      ) {
        timer = setTimeout(check, 150);
        return;
      }
      setState("leaving");
      timer = setTimeout(() => {
        stop();
        html.removeAttribute(FLAG);
        setState("gone");
      }, LEAVE_MS);
    };
    check();
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, []);

  if (state === "gone") return null;
  return (
    <div
      className="app-splash"
      data-leaving={state === "leaving" || undefined}
      role="status"
      aria-label="Opening Àríyá"
    >
      <div className="app-splash__glow" aria-hidden="true" />
      <div className="app-splash__body" aria-hidden="true">
        <div className="app-splash__seal" ref={seal}>
          <svg viewBox="0 0 64 64" width="104" height="104">
            <defs>
              <linearGradient id="splash-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f6e2ad" />
                <stop offset=".5" stopColor="#c39446" />
                <stop offset="1" stopColor="#f1d9a0" />
              </linearGradient>
              <radialGradient id="splash-wine" cx=".35" cy=".3" r=".9">
                <stop offset="0" stopColor="#7a1530" />
                <stop offset="1" stopColor="#2a0610" />
              </radialGradient>
            </defs>
            <rect width="64" height="64" rx="14" fill="url(#splash-wine)" />
            <rect
              x="4"
              y="4"
              width="56"
              height="56"
              rx="11"
              fill="none"
              stroke="url(#splash-gold)"
              strokeWidth="1.2"
              opacity=".7"
            />
            <text
              x="32"
              y="47"
              textAnchor="middle"
              fontFamily="var(--font-bodoni-moda), Didot, Georgia, serif"
              fontStyle="italic"
              fontSize="40"
              fill="url(#splash-gold)"
            >
              À
            </text>
          </svg>
          <span className="app-splash__shine" />
        </div>
        <p className="app-splash__word">Àríyá</p>
        <p className="app-splash__tag">Wedding &amp; Event Suite</p>
        {hello && (
          <p className="app-splash__hello">
            <span>{hello[0]}</span> · {hello[1]}
          </p>
        )}
      </div>
      <canvas ref={canvas} className="app-splash__fx" aria-hidden="true" />
      <p className="app-splash__hint" aria-hidden="true">
        Tap for petals
      </p>
    </div>
  );
}
