"use client";

import React, { useCallback, useRef, useState } from "react";

interface Spark {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  s: number;
  hue: string;
}

const HUES = ["#e9c98a", "#f6dca8", "#ffffff", "#f57c8a"];

/**
 * Tap anywhere and a little burst of gold stars blooms under your finger. Pure decoration: it never
 * blocks the click, and it stays quiet for reduced motion.
 */
export function SparkleSurface({
  children,
  className = "",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const seq = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const burst = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
      const d = 28 + Math.random() * 46;
      return {
        id: ++seq.current,
        x,
        y,
        dx: Math.cos(a) * d,
        dy: Math.sin(a) * d,
        s: 6 + Math.random() * 8,
        hue: HUES[i % HUES.length],
      };
    });
    setSparks((prev) => [...prev.slice(-36), ...burst]);
    const ids = new Set(burst.map((b) => b.id));
    window.setTimeout(
      () => setSparks((prev) => prev.filter((p) => !ids.has(p.id))),
      900
    );
  }, []);

  return (
    <div
      className={`relative ${className}`}
      onPointerDown={onPointerDown}
      {...rest}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        aria-hidden="true"
      >
        {sparks.map((p) => (
          <svg
            key={p.id}
            viewBox="0 0 10 10"
            className="desk-sparkle absolute"
            style={
              {
                left: p.x - p.s / 2,
                top: p.y - p.s / 2,
                width: p.s,
                height: p.s,
                "--dx": `${p.dx}px`,
                "--dy": `${p.dy}px`,
              } as React.CSSProperties
            }
          >
            <path
              d="M5 0 6.2 3.8 10 5 6.2 6.2 5 10 3.8 6.2 0 5 3.8 3.8Z"
              fill={p.hue}
            />
          </svg>
        ))}
      </div>
    </div>
  );
}
