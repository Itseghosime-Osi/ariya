"use client";

import React, { useEffect, useRef } from "react";

/**
 * Gold dust drifting up through the velvet, twinkling, and scattering away from the cursor like
 * confetti caught in a breeze. A small canvas: about fifty flecks, paused when off screen or in a
 * background tab, drawn once and left still for reduced motion.
 */
export function GoldDust({ density = 50 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    const pointer = { x: -9999, y: -9999 };
    type Fleck = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      t: number;
      tw: number;
    };
    let flecks: Fleck[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (flecks.length === 0) {
        flecks = Array.from({ length: density }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.15,
          vy: -(0.12 + Math.random() * 0.35),
          r: 0.6 + Math.random() * 1.8,
          t: Math.random() * Math.PI * 2,
          tw: 0.01 + Math.random() * 0.03,
        }));
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const f of flecks) {
        const a = 0.35 + 0.45 * Math.sin(f.t);
        ctx.beginPath();
        ctx.fillStyle = `rgba(233, 201, 138, ${a.toFixed(3)})`;
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
        if (f.r > 1.8) {
          ctx.fillStyle = `rgba(255, 246, 220, ${(a * 0.5).toFixed(3)})`;
          ctx.fillRect(f.x - f.r * 2, f.y - 0.3, f.r * 4, 0.6);
          ctx.fillRect(f.x - 0.3, f.y - f.r * 2, 0.6, f.r * 4);
        }
      }
    };

    const step = () => {
      for (const f of flecks) {
        const dx = f.x - pointer.x;
        const dy = f.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 110 * 110) {
          const d = Math.sqrt(d2) || 1;
          const push = (1 - d / 110) * 1.6;
          f.vx += (dx / d) * push * 0.18;
          f.vy += (dy / d) * push * 0.18;
        }
        f.vx *= 0.96;
        f.vy = f.vy * 0.96 + -0.012;
        f.x += f.vx;
        f.y += f.vy;
        f.t += f.tw;
        if (f.y < -6) {
          f.y = h + 6;
          f.x = Math.random() * w;
        }
        if (f.x < -6) f.x = w + 6;
        if (f.x > w + 6) f.x = -6;
      }
      draw();
    };

    resize();
    draw();
    if (reduce) return;

    let raf = 0;
    let visible = true;
    const loop = () => {
      step();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    io.observe(canvas);
    const host = canvas.parentElement;
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    host?.addEventListener("pointermove", onMove);
    host?.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", start);
    window.addEventListener("resize", resize);
    start();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      host?.removeEventListener("pointermove", onMove);
      host?.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", start);
      window.removeEventListener("resize", resize);
    };
  }, [density]);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
