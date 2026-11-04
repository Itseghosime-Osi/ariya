"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SceneStage } from "@/components/film/SceneStage";

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function seg(p: number, a: number, b: number) {
  const x = clamp((p - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

// The reception hall: the film's banquet set, framed by how far the band has
// been scrolled. The counts and the scene read the same progress.
export function Hall() {
  const [live, setLive] = useState(false);
  const [counts, setCounts] = useState({ confirmed: 0, seated: 0 });
  const sectionRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef(0);
  const onStageReady = useCallback(() => setLive(true), []);

  // Every yes takes a seat: the counts follow the scroll.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let raf = 0;
    let last = -1;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const h = section.getBoundingClientRect();
        const f = clamp(
          -h.top / Math.max(1, h.height - window.innerHeight),
          0,
          1
        );
        const p = 0.785 + f * 0.095;
        if (Math.abs(p - last) <= 0.0004) return;
        last = p;
        progressRef.current = p;
        const fill = seg(p, 0.79, 0.87);
        setCounts({
          confirmed: Math.round(fill * 241),
          seated: Math.round(fill * 218),
        });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={live ? "hallband live" : "hallband"}
      id="hall"
      aria-labelledby="hallTitle"
    >
      <div className="hb-sticky">
        <div className="hb-stage" aria-hidden="true">
          <div className="stage3d">
            <SceneStage
              mode="hall"
              progressRef={progressRef}
              onReady={onStageReady}
            />
          </div>
          <p className="hb-wait">Lighting the candles…</p>
        </div>
        <div className="hb-scrim" aria-hidden="true" />
        <div className="wrap hb-copy">
          <span className="caps">The hall, live</span>
          <h2 id="hallTitle">
            Every yes takes <em className="foil-text">a seat.</em>
          </h2>
          <dl className="hb-counts">
            <div>
              <dt>Confirmed</dt>
              <dd>{counts.confirmed}</dd>
            </div>
            <div>
              <dt>Seated</dt>
              <dd>{counts.seated}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
