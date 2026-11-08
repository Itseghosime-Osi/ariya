"use client";

import { useEffect, useRef, useState } from "react";
import { EntrySeal } from "@/features/invitations/components/EntrySeal";
import { THEME_PALETTES } from "@/features/invitations/design";

const GUESTS = [
  ["Adaeze Okafor", "party of 2", "Table 3", "ARY-7K2M-99NP"],
  ["Uncle Dayo", "party of 1", "Table 1", "ARY-4D8Q-31LC"],
  ["Bisi Adebayo", "party of 5", "Table 3", "ARY-9B6T-70RW"],
  ["Emeka & Ifeoma", "party of 2", "Table 6", "ARY-2F5H-48ZX"],
  ["Tolu Bankole", "party of 1", "Table 2", "ARY-6M3V-15KE"],
] as const;

const TOTAL = 240;
const PALETTE = THEME_PALETTES.royal_gold;

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
function seg(p: number, a: number, b: number) {
  const x = clamp((p - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

type Phase = "arrive" | "scan" | "verify" | "admitted";

/**
 * Chapter VI. The invitation's crest reaches the door, the scanner reads it, the desk shows who it
 * is, and a tap lets them in. Scroll drives the whole scene, one guest at a time.
 */
export function Door() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const beamRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState({
    guest: 0,
    phase: "arrive" as Phase,
    count: 0,
  });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let frame = 0;

    const apply = (p: number) => {
      const slice = 1 / GUESTS.length;
      const guest = Math.min(GUESTS.length - 1, Math.floor(p / slice));
      const t = clamp((p - guest * slice) / slice, 0, 1);
      const arrive = seg(t, 0, 0.4);
      const out = seg(t, 0.88, 1);
      const phase: Phase =
        t < 0.4
          ? "arrive"
          : t < 0.58
            ? "scan"
            : t < 0.74
              ? "verify"
              : "admitted";
      const done = Math.round(
        (guest + (phase === "admitted" ? 1 : 0)) * (211 / GUESTS.length)
      );
      const card = cardRef.current;
      if (card) {
        const x = (1 - arrive) * 62 - out * 70;
        const y = out * -8;
        const rot = (1 - arrive) * 9 - out * 6;
        card.style.transform = `translate(${x}%, ${y}%) rotate(${rot}deg)`;
        card.style.opacity = String(Math.min(arrive * 1.4, 1) * (1 - out));
        card.dataset.scanned = phase === "arrive" ? "0" : "1";
      }
      const beam = beamRef.current;
      if (beam) {
        const s = seg(t, 0.4, 0.58);
        beam.style.opacity = phase === "scan" ? "1" : "0";
        beam.style.transform = `translateY(${(s * 100).toFixed(1)}%)`;
      }
      setView((v) =>
        v.guest === guest && v.phase === phase && v.count === done
          ? v
          : { guest, phase, count: done }
      );
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = section.getBoundingClientRect();
        const span = r.height - window.innerHeight;
        apply(clamp(span > 0 ? -r.top / span : 0, 0, 0.999));
      });
    };

    if (reduce) {
      apply(0.46);
      return;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const g = GUESTS[view.guest];
  const admitted = view.phase === "admitted";

  return (
    <section
      ref={sectionRef}
      className="c-door"
      id="door"
      aria-label="On the day: scan a guest's seal, check who it is, then admit them"
    >
      <div className="sticky">
        <div className="door-arch" aria-hidden="true" />
        <div className="wrap door-grid">
          <div className="door-copy">
            <span className="caps">Saturday, 12 December · 4:10 pm</span>
            <h2>
              No queue <em className="foil-text">at the door.</em>
            </h2>
            <p>
              Scan the seal on the invitation, or type the code. The desk shows
              who it is and where they sit. Nobody walks in until you tap Admit.
            </p>
            <div className="door-count" aria-hidden="true">
              <div>
                <b>{view.count}</b>
                <span>of {TOTAL} admitted</span>
              </div>
              <div className="bar">
                <i style={{ width: `${(view.count / TOTAL) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="door-stage" aria-hidden="true">
            <div className="scanner">
              <div className="beam" ref={beamRef} />
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
            </div>
            <div className="pass" ref={cardRef} data-scanned="0">
              <div className="pass-top">
                <small>Together with their families</small>
                <b>Chidinma &amp; Tunde</b>
              </div>
              <div className="pass-seal">
                <EntrySeal value={g[3]} palette={PALETTE} plate />
              </div>
              <small className="pass-foot">{g[0]}</small>
            </div>
            <div className={`desk-chip ${view.phase}`}>
              <span className="who">{g[0]}</span>
              <span className="meta">
                {g[1]} · {g[2]}
              </span>
              <span className="btn-admit">
                {admitted
                  ? "✓ Admitted · 4:" + String(10 + view.guest * 2)
                  : "Admit"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
