"use client";

import { useEffect, useRef } from "react";

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

/** Smooth 0 to 1 between two points of a scene's progress. */
export function seg(p: number, a: number, b: number) {
  const x = clamp((p - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * A tall section with a sticky stage inside it: sets `--p` (0 to 1, how far through the section the
 * reader is) on the element, so CSS can animate from it, and reports the same number for the parts
 * that need a figure. Reduced motion gets the finished scene.
 */
export function useScene<T extends HTMLElement>(
  onProgress?: (p: number) => void
) {
  const ref = useRef<T | null>(null);
  const cb = useRef(onProgress);
  cb.current = onProgress;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = (p: number) => {
      el.style.setProperty("--p", p.toFixed(4));
      cb.current?.(p);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      set(0.92);
      return;
    }
    let frame = 0;
    const read = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      set(clamp(span > 0 ? -r.top / span : 0, 0, 1));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}
