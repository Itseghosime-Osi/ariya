"use client";

import { useEffect } from "react";

/** Page-level behaviour for the product tour: the reveal flag and the scroll-in of chapter cards. */
export function ProductEngines() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const reveals = Array.from(document.querySelectorAll(".reveal"));
    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window && !reduce) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              io?.unobserve(e.target);
            }
          }
        },
        { rootMargin: "0px 0px -10% 0px" }
      );
      for (const el of reveals) io.observe(el);
    } else {
      for (const el of reveals) el.classList.add("in");
    }
    return () => {
      io?.disconnect();
      root.classList.remove("js");
    };
  }, []);
  return null;
}
