"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MSGS: ReadonlyArray<readonly [string, string]> = [
  ["Aunty Bisi", "Is it 300 or 450 people now??"],
  ["Femi", "RSVP to who exactly?"],
  ["Mummy C", "My church members are coming o. All of them."],
  ["Kemi (planner)", "Who has the final list? Anybody?"],
  ["Tolu", "I didn't get invite o"],
  ["Uncle Dayo", "Which table am I?"],
  ["Ngozi", "Send the aso ebi account number again"],
  ["Aunty Bisi", "Me and my 4 children will be there"],
  ["Seun", "Is the reception in VI or Lekki?"],
  ["Caterer", "How many plates did we agree?"],
  ["Mummy C", "Add Mrs Okafor. And her sister."],
  ["Tunde", "Babe I think we've lost count"],
];

const LEDGER = [
  ["Bisi Adebayo", "party of 5 · Table 3", "yes", "Coming"],
  ["Emeka & Ifeoma Okafor", "party of 2", "wait", "Link sent"],
  ["Dayo Ogunleye", "Table 1", "yes", "Coming"],
  ["Tolu Bankole", "invite resent", "wait", "Link sent"],
  ["Femi Adeyemi", "Table 2", "yes", "Coming"],
];

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function seg(p: number, a: number, b: number) {
  const x = clamp((p - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

export function Noise() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const bubbleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ledgerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [unread, setUnread] = useState(0);
  const [showList, setShowList] = useState({ nt1: 1, nt2: 0, lift: 0 });

  // Laid out once, deterministically, so the storm looks the same every visit.
  const bubbles = useMemo(() => {
    let s = 11;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    return MSGS.map(([who, said], i) => {
      const col = i % 3;
      const x = 4 + col * 31 + rnd() * 10;
      const y = 8 + Math.floor(i / 3) * 21 + rnd() * 6;
      const z = rnd();
      const from = (rnd() - 0.5) * 120;
      const time = `${14 + (i >> 2)}:${String((i * 7 + 3) % 60).padStart(2, "0")}`;
      return { who, said, x, y, z, from, at: 0.03 + i * 0.026, time };
    });
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const n = section.getBoundingClientRect();
        if (n.bottom <= 0 || n.top >= window.innerHeight) return;
        const p = reduce
          ? 1
          : clamp(-n.top / (n.height - window.innerHeight), 0, 1);
        const conv = seg(p, 0.5, 0.72);
        const W = window.innerWidth;
        const H = window.innerHeight;

        bubbles.forEach((b, i) => {
          const el = bubbleRefs.current[i];
          if (!el) return;
          const inn = seg(p, b.at, b.at + 0.06);
          const o = inn * (1 - seg(p, 0.6, 0.72));
          const dx = ((50 - b.x - 12) / 100) * W * conv;
          const dy = ((50 - b.y) / 100) * H * conv;
          const s = (0.78 + b.z * 0.42) * (1 - conv * 0.75);
          el.style.opacity = o.toFixed(3);
          el.style.transform = `translate(${(dx + (1 - inn) * b.from).toFixed(1)}px,${(dy + (1 - inn) * 40).toFixed(1)}px) scale(${s.toFixed(3)})`;
          el.style.filter = reduce
            ? "none"
            : `blur(${(Math.abs(b.z - 0.6) * 5 + conv * 3).toFixed(2)}px)`;
        });

        setUnread(Math.round(seg(p, 0.03, 0.4) * 312));
        const nt2 = seg(p, 0.6, 0.7);
        setShowList({
          nt1: seg(p, 0.02, 0.1) * (1 - seg(p, 0.48, 0.58)),
          nt2,
          lift: -H * 0.2 * nt2,
        });

        const lo = seg(p, 0.66, 0.76);
        if (ledgerRef.current) {
          ledgerRef.current.style.opacity = lo.toFixed(3);
          ledgerRef.current.style.transform = `translate(-50%, ${(-30 + (1 - lo) * 10).toFixed(1)}%)`;
        }
        rowRefs.current.forEach((li, i) => {
          if (!li) return;
          const r = seg(p, 0.7 + i * 0.035, 0.76 + i * 0.035);
          li.style.opacity = r.toFixed(3);
          li.style.transform = `translateY(${((1 - r) * 6).toFixed(1)}px)`;
        });
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [bubbles]);

  const { nt2, lift } = showList;

  return (
    <section
      ref={sectionRef}
      className="c-noise"
      id="noise"
      aria-label="The problem: RSVPs lost in group chats"
    >
      <div className="sticky">
        <div id="storm" aria-hidden="true">
          {bubbles.map((b, i) => (
            <div
              key={`${b.who}-${i}`}
              className="bub"
              ref={(el) => {
                bubbleRefs.current[i] = el;
              }}
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                zIndex: Math.round(b.z * 10),
              }}
            >
              <b>{b.who}</b>
              {b.said}
              <i>{b.time}</i>
            </div>
          ))}
        </div>
        <div className="noise-type">
          <div style={{ opacity: showList.nt1 }}>
            <span className="caps">
              Chidinma &amp; Tunde 2026 · family group
            </span>
            <p className="big">
              <span>{unread}</span> unread
            </p>
          </div>
          <div
            style={{
              opacity: nt2,
              transform: `translateY(${lift.toFixed(1)}px)`,
            }}
          >
            <span className="caps">With Àríyá</span>
            <p className="big">
              One <em className="foil-text">list.</em>
            </p>
          </div>
        </div>
        <div className="ledger paper" ref={ledgerRef} aria-hidden="true">
          <h3>
            <span>Guest list</span>
            <span>5 replies</span>
          </h3>
          <ul>
            {LEDGER.map(([name, meta, pill, label], i) => (
              <li
                key={name}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
              >
                <span>{name}</span>
                <small>{meta}</small>
                <em className={`pill ${pill}`}>{label}</em>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
