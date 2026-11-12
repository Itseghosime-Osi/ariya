"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Tent } from "lucide-react";
import { cn } from "@/lib/utils";

/** How solid a tent roof is drawn by default: there, but the tables show through it. */
export const ROOF_DEFAULT = 0.6;
const STORE = "ariya:hall-roof";

/** The host's roof setting on this device, or the default when none is stored. */
export function storedRoof(): number {
  try {
    const v = Number(localStorage.getItem(STORE));
    return localStorage.getItem(STORE) !== null && v >= 0 && v <= 1
      ? v
      : ROOF_DEFAULT;
  } catch {
    return ROOF_DEFAULT;
  }
}

const CHANGED = "ariya:hall-roof-changed";

export function storeRoof(v: number) {
  try {
    localStorage.setItem(STORE, String(v));
  } catch {
    /* private mode: the setting lasts until the page closes */
    memory = v;
  }
  window.dispatchEvent(new Event(CHANGED));
}

let memory: number | null = null;

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * The roof setting and a way to change it, remembered on this device. The server draws the
 * default, and the browser picks up the stored value as soon as it takes over.
 */
export function useRoofSetting(): [number, (v: number) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => memory ?? storedRoof(),
    () => ROOF_DEFAULT
  );
  return [value, storeRoof];
}

const PRESETS: [string, number][] = [
  ["Hide", 0],
  ["Half", 0.5],
  ["Solid", 1],
];

/**
 * How much of a tent roof to draw, so a host can see the venue as it will look and still get at
 * the tables under it: a slider from hidden to solid, and three quick settings.
 */
export function RoofControl({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pct = Math.round(value * 100);

  useEffect(() => {
    if (!open) return;
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

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Roof, ${pct === 0 ? "hidden" : `${pct}% solid`}`}
        title="How much of the roof to show"
        className={cn(
          "inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-night transition-colors hover:bg-[#f1ece4] aria-expanded:bg-night aria-expanded:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
          className
        )}
      >
        <Tent size={15} aria-hidden="true" />
        Roof
        <span className="tabular-nums opacity-70">
          {pct === 0 ? "off" : `${pct}%`}
        </span>
      </button>
      {open && (
        <div
          data-testid="roof-control"
          className="absolute bottom-[calc(100%+0.75rem)] right-0 z-40 w-64 rounded-2xl border border-hairline bg-white p-3 text-night shadow-xl"
        >
          <label className="block">
            <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a5b67]">
              Roof
              <span className="tabular-nums normal-case tracking-normal text-night">
                {pct === 0 ? "Hidden" : `${pct}%`}
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={pct}
              onChange={(e) => onChange(Number(e.target.value) / 100)}
              aria-label="How solid the roof is"
              aria-valuetext={pct === 0 ? "Hidden" : `${pct}% solid`}
              className="mt-2 h-11 w-full accent-burgundy"
            />
          </label>
          <div
            className="grid grid-cols-3 gap-1.5"
            role="group"
            aria-label="Quick roof settings"
          >
            {PRESETS.map(([label, v]) => (
              <button
                key={label}
                type="button"
                aria-pressed={pct === Math.round(v * 100)}
                onClick={() => onChange(v)}
                className="min-h-11 rounded-full border border-hairline text-xs font-semibold text-night hover:bg-ivory aria-pressed:border-night aria-pressed:bg-night aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-burgundy"
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-label-2">
            Lower it to work on the tables under the roof. In the Top view the
            roof is always see-through.
          </p>
        </div>
      )}
    </div>
  );
}
