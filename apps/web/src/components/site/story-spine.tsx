"use client";

import { useEffect, useRef, useState } from "react";
import { measure, type StoryChapter } from "./story";

/**
 * The thread through a story page: a gold line that fills as you read, the chapter you are in, and
 * a running figure (days to go, or how far through the tour). A rail on wide screens, a small pill
 * on phones. It only reads the scroll position, so the scenes keep their own timing.
 */
export function StorySpine({
  chapters,
  mode,
}: {
  chapters: readonly StoryChapter[];
  /** "days" counts down to the wedding; "steps" counts chapters. */
  mode: "days" | "steps";
}) {
  const [state, setState] = useState(() => ({
    index: 0,
    ...measure(mode, chapters, 0, 0),
  }));
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const mid = window.innerHeight * 0.5;
      let index = 0;
      let within = 0;
      for (let i = 0; i < chapters.length; i += 1) {
        const el = document.getElementById(chapters[i].id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= mid) {
          index = i;
          within = Math.min(
            1,
            Math.max(0, (mid - r.top) / Math.max(1, r.height))
          );
        }
      }
      const m = measure(mode, chapters, index, within);
      setState((s) =>
        s.index === index && s.big === m.big && s.pill === m.pill
          ? s
          : { index, ...m }
      );
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const p =
        total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
      barRef.current?.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [chapters, mode]);

  const current = chapters[state.index];

  return (
    <>
      <div className="spine-bar" ref={barRef} aria-hidden="true">
        <i />
      </div>
      <nav className="spine" aria-label="Story chapters">
        <ol>
          {chapters.map((c, i) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                aria-current={i === state.index ? "step" : undefined}
                className={i < state.index ? "done" : undefined}
              >
                <span className="dot" aria-hidden="true" />
                <span className="num">{c.n}</span>
                <span className="ttl">{c.title}</span>
              </a>
            </li>
          ))}
        </ol>
        <p className="count" aria-live="off">
          <b>{state.big}</b>
          <span>{state.small}</span>
          <em>
            {current.n} · {current.title}
          </em>
        </p>
      </nav>
      <p className="spine-pill" aria-hidden="true">
        <span>{current.n}</span> {current.title}
        <i /> {state.pill}
      </p>
    </>
  );
}
