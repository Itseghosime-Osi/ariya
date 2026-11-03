"use client";

import { useEffect, useRef, useState } from "react";

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function seg(p: number, a: number, b: number) {
  const x = clamp((p - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

// The reception hall, rendered by the film engine in embed mode. Hidden when
// the browser cannot draw it, so the page never shows an empty frame.
export function Hall() {
  const [supported, setSupported] = useState(false);
  const [live, setLive] = useState(false);
  const [counts, setCounts] = useState({ confirmed: 0, seated: 0 });
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

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
    setSupported(gl2 && !saveData);
  }, []);

  // Mount the stage only once the section is near the viewport.
  useEffect(() => {
    if (!supported) return;
    const section = sectionRef.current;
    const host = stageRef.current;
    if (!section || !host) return;

    let frame: HTMLIFrameElement | null = null;
    const timer = { id: 0 };

    const mount = () => {
      frame = document.createElement("iframe");
      const velvet =
        document.documentElement.getAttribute("data-cotd") ?? "burgundy";
      frame.src = `/site/index.html?embed=hall&velvet=${velvet}`;
      frame.title = "Live 3D scene: the reception hall";
      frame.tabIndex = -1;
      frame.setAttribute("aria-hidden", "true");
      host.appendChild(frame);
      frameRef.current = frame;
      timer.id = window.setTimeout(() => {
        frame?.remove();
        frameRef.current = null;
      }, 30000);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          io.disconnect();
          mount();
        }
      },
      { rootMargin: "120% 0px" }
    );
    io.observe(section);

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.type === "ariya-stage-ready") {
        window.clearTimeout(timer.id);
        setLive(true);
        frameRef.current?.contentWindow?.postMessage(
          {
            type: "ariya-stage",
            visible: true,
            velvet: document.documentElement.getAttribute("data-cotd"),
          },
          location.origin
        );
      }
      if (e.data.type === "ariya-stage-failed") {
        frame?.remove();
        frameRef.current = null;
      }
    };
    window.addEventListener("message", onMessage);

    return () => {
      io.disconnect();
      window.clearTimeout(timer.id);
      window.removeEventListener("message", onMessage);
      frame?.remove();
      frameRef.current = null;
    };
  }, [supported]);

  // Every yes takes a seat: the counts follow the scroll.
  useEffect(() => {
    if (!supported) return;
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
        const fill = seg(p, 0.79, 0.87);
        if (Math.abs(p - last) > 0.0004) {
          last = p;
          setCounts({
            confirmed: Math.round(fill * 241),
            seated: Math.round(fill * 218),
          });
          frameRef.current?.contentWindow?.postMessage(
            { type: "ariya-stage", p },
            location.origin
          );
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [supported]);

  if (!supported) return null;

  return (
    <section
      ref={sectionRef}
      className={live ? "hallband live" : "hallband"}
      id="hall"
      aria-labelledby="hallTitle"
    >
      <div className="hb-sticky">
        <div className="hb-stage" aria-hidden="true">
          <div className="stage3d" ref={stageRef} />
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
