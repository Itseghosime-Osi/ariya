"use client";

import Link from "next/link";
import { useMemo } from "react";

// Gold flecks drifting down over the last scene. Deterministic, so the server
// and the browser draw the same page.
function seeded(s: number) {
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function Finale() {
  const flecks = useMemo(() => {
    const rnd = seeded(7);
    return Array.from({ length: 34 }, () => ({
      left: (rnd() * 100).toFixed(1),
      dur: (6 + rnd() * 7).toFixed(1),
      delay: -(rnd() * 12).toFixed(1),
      dx: ((rnd() - 0.5) * 120).toFixed(0),
      rot: (300 + rnd() * 500).toFixed(0),
    }));
  }, []);

  return (
    <section className="c-finale" id="dance" aria-labelledby="danceTitle">
      <div id="flecks" aria-hidden="true">
        {flecks.map((f, i) => (
          <i
            key={i}
            className="fleck"
            style={
              {
                left: `${f.left}%`,
                animationDuration: `${f.dur}s`,
                animationDelay: `${f.delay}s`,
                "--dx": `${f.dx}px`,
                "--rot": `${f.rot}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="wrap" style={{ position: "relative" }}>
        <span className="caps">The list is done. The tables are full.</span>
        <h2 id="danceTitle" style={{ marginTop: 16 }}>
          Now go and <em className="foil-text">dance.</em>
        </h2>
        <div className="actions">
          <Link className="btn btn-primary" href="/events">
            Start planning
          </Link>
          <Link className="btn btn-ghost" href="/product">
            What Àríyá does
          </Link>
          <Link className="btn btn-ghost" href="/pricing">
            Pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
