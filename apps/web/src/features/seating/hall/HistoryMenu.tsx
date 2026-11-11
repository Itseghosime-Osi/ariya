"use client";

import { useEffect, useRef, useState } from "react";
import { History } from "lucide-react";

export interface HistoryEntry {
  key: string;
  label: string;
  at: number;
  /** Go back to just before this step. */
  onRevert: () => void;
}

function ago(at: number, now: number) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h} h ago`;
}

/**
 * What changed in this visit, newest first, and a way back to before any of it. Each row names
 * the step in the host's words ("Resized the room to 32 × 20 m", "Seated 144 guests").
 */
export function HistoryMenu({
  entries,
  className,
}: {
  entries: HistoryEntry[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !box.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  const list = [...entries].sort((a, b) => b.at - a.at).slice(0, 20);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        className={className}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="History"
        title="History"
        disabled={entries.length === 0}
      >
        <History size={17} aria-hidden="true" />
      </button>
      {open && (
        <div
          data-testid="hall-history"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-72 rounded-2xl border border-hairline bg-white p-2 text-night shadow-xl"
        >
          <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-ink">
            This visit
          </p>
          <ul>
            {list.map((e) => (
              <li key={e.key}>
                <button
                  type="button"
                  onClick={() => {
                    e.onRevert();
                    setOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-2 text-left text-xs hover:bg-ivory focus-visible:outline-2 focus-visible:outline-burgundy"
                >
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {e.label}
                  </span>
                  <span className="shrink-0 text-[11px] text-label-2">
                    {ago(e.at, now)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="px-2 pt-1 text-[11px] text-label-2">
            Choose a step to go back to just before it.
          </p>
        </div>
      )}
    </div>
  );
}
