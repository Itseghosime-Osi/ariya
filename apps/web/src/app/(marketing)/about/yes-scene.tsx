"use client";

import { useEffect, useRef } from "react";

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function seg(p: number, a: number, b: number) {
  const x = clamp((p - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

// The foil catches the light as you scroll.
export function YesScene() {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = el.getBoundingClientRect();
        if (y.bottom <= 0 || y.top >= window.innerHeight) return;
        const q = clamp(
          1 - (y.top + y.height) / (window.innerHeight + y.height),
          0,
          1
        );
        el.style.setProperty("--lx", (q * 2 - 1).toFixed(3));
        el.style.setProperty(
          "--ys",
          (0.88 + 0.16 * seg(q, 0.1, 0.6)).toFixed(3)
        );
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      ref={ref}
      className="c-yes"
      id="yes"
      aria-label="From the first yes to the last dance"
    >
      <p className="l1">From the first</p>
      <p className="l2 foil-text" aria-hidden="true">
        yes
      </p>
      <p className="l3">to the last dance.</p>
    </section>
  );
}
