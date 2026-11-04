"use client";

import { useEffect } from "react";
import { initPacedScroll } from "@/lib/site/paced-scroll";
import { installScoreHandlers } from "@/lib/site/score";

// Page-level behaviour for the cinematic about page: the paced scroll engine,
// the music handoff, the reveal observer and the header going solid over the
// film. Renders nothing.
export function AboutEngines() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");

    const disposeScroll = initPacedScroll({ speed: 0.9 });
    const disposeScore = installScoreHandlers();

    const header = document.querySelector("header.site-head");
    header?.classList.add("cine-head");
    const onScroll = () => {
      header?.classList.toggle(
        "solid",
        window.scrollY > window.innerHeight * 0.7
      );
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Section reveals (content stays visible without observers)
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const reveals = Array.from(document.querySelectorAll(".reveal"));
    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window && !reduce) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io?.unobserve(entry.target);
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
      disposeScroll();
      disposeScore();
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
      header?.classList.remove("cine-head", "solid");
      root.classList.remove("js");
    };
  }, []);

  return null;
}
