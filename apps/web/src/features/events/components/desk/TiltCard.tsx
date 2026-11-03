"use client";

import React, { useEffect, useRef } from "react";

/**
 * A card that leans toward the pointer and catches the light: a gentle 3D tilt plus a foil sheen that
 * follows the cursor (children opt in with the `foil-sheen` class). Pointer-driven through CSS
 * variables, so React never re-renders on move. Still on touch screens and for reduced motion.
 */
export function TiltCard({
  children,
  className = "",
  max = 7,
  as = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
  as?: "div" | "section" | "figure";
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!fine || reduce) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--ry", `${(x - 0.5) * max * 2}deg`);
        el.style.setProperty("--rx", `${(0.5 - y) * max * 2}deg`);
        el.style.setProperty("--gx", `${x * 100}%`);
        el.style.setProperty("--gy", `${y * 100}%`);
        el.dataset.tilting = "true";
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--rx", "0deg");
      delete el.dataset.tilting;
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [max]);

  const Comp = as as "div";
  return (
    <Comp
      ref={ref as React.Ref<HTMLDivElement>}
      className={`desk-tilt ${className}`}
      {...rest}
    >
      {children}
    </Comp>
  );
}
