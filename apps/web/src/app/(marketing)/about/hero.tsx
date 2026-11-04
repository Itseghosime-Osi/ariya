"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { InvitationCard } from "@/components/site/fine-card";
import { SceneStage } from "@/components/site/scene-stage";

const COTD = [
  ["burgundy", "Burgundy", "#5a1428"],
  ["ruby", "Ruby", "#96182e"],
  ["coral", "Coral", "#a3402a"],
] as const;

type Velvet = (typeof COTD)[number][0];

export function Hero() {
  const [velvet, setVelvet] = useState<Velvet>("burgundy");
  const [live, setLive] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);
  const onStageReady = useCallback(() => setLive(true), []);

  // Colour of the day: recolours the invitations and the live 3D box.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("ariya-cotd");
    } catch {
      /* not remembered */
    }
    if (saved === "ruby" || saved === "coral") setVelvet(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-cotd", velvet);
  }, [velvet]);

  // The colour of the day belongs to this page only.
  useEffect(
    () => () => document.documentElement.removeAttribute("data-cotd"),
    []
  );

  function choose(next: Velvet) {
    setVelvet(next);
    try {
      localStorage.setItem("ariya-cotd", next);
    } catch {
      /* not remembered */
    }
    navigator.vibrate?.(12);
  }

  // The foil catches the light as you scroll.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const lx = Math.min(
          1,
          Math.max(0, window.scrollY / window.innerHeight)
        );
        hero.style.setProperty("--lx", (lx * 2 - 1).toFixed(3));
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
      ref={heroRef}
      className={live ? "c-hero live" : "c-hero"}
      id="hero"
      aria-labelledby="heroTitle"
    >
      <div className="stage3d" id="heroStage" aria-hidden="true">
        <SceneStage mode="hero" onReady={onStageReady} />
      </div>
      <div className="c-poster" aria-hidden="true">
        <InvitationCard variant="auto" aSub="Okeke" bSub="Ajayi" />
      </div>
      <div className="c-scrim" aria-hidden="true" />
      <div className="c-copy">
        <div className="wrap">
          <span className="caps">
            About Àríyá · Weddings · Introductions · Owambes
          </span>
          <h1 id="heroTitle">
            Every celebration begins with a <em className="foil-text">yes.</em>
          </h1>
          <p className="lede">
            Personal invitations, live RSVPs and seating for Nigerian
            celebrations.
          </p>
          <div className="actions">
            <Link className="btn btn-primary" href="/events">
              Start planning
            </Link>
            <Link className="btn btn-ghost" href="/product">
              See what we do
            </Link>
          </div>
        </div>
      </div>
      <div className="cotd" role="group" aria-labelledby="cotdLabel">
        <span className="caps" id="cotdLabel">
          Colour of the day
        </span>
        <b className="foil-text" id="cotdName" aria-live="polite">
          {COTD.find(([key]) => key === velvet)?.[1]}
        </b>
        <div className="sw">
          {COTD.map(([key, name, colour]) => (
            <button
              key={key}
              type="button"
              style={{ "--c": colour } as React.CSSProperties}
              aria-pressed={velvet === key}
              aria-label={name}
              onClick={() => choose(key)}
            />
          ))}
        </div>
      </div>
      <div className="scroll-hint" aria-hidden="true">
        Scroll
        <i />
      </div>
    </section>
  );
}
