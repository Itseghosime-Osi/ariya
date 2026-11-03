"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { InvitationCard } from "@/components/site/fine-card";

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
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

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
    frameRef.current?.contentWindow?.postMessage(
      { type: "ariya-stage", velvet },
      location.origin
    );
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

  // Live 3D (the film engine in embed mode), loaded after the page is usable.
  useEffect(() => {
    const gl2 = (() => {
      try {
        return !!document.createElement("canvas").getContext("webgl2");
      } catch {
        return false;
      }
    })();
    const saveData = (
      navigator as unknown as { connection?: { saveData?: boolean } }
    ).connection?.saveData;
    const host = stageRef.current;
    if (!gl2 || saveData || !host) return;

    const frame = document.createElement("iframe");
    frame.src = `/site/index.html?embed=hero&velvet=${velvet}`;
    frame.title = "Live 3D scene: the ring box";
    frame.tabIndex = -1;
    frame.setAttribute("aria-hidden", "true");
    host.appendChild(frame);
    frameRef.current = frame;

    const timer = window.setTimeout(() => {
      frame.remove();
      frameRef.current = null;
    }, 30000);

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.type === "ariya-stage-ready") {
        window.clearTimeout(timer);
        setLive(true);
        frame.contentWindow?.postMessage(
          { type: "ariya-stage", visible: true, velvet },
          location.origin
        );
      }
      if (e.data.type === "ariya-stage-failed") {
        frame.remove();
        frameRef.current = null;
      }
    };
    window.addEventListener("message", onMessage);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      frame.remove();
      frameRef.current = null;
    };
    // the iframe is mounted once; velvet changes are posted in the effect above
  }, []);

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
      <div
        className="stage3d"
        id="heroStage"
        ref={stageRef}
        aria-hidden="true"
      />
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
