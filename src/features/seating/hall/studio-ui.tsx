"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { clamp, round2 } from "./model";

/** Colours offered everywhere a colour can be picked. */
export const PALETTE = [
  "#6e1426",
  "#3a0f1a",
  "#a3263b",
  "#d9644a",
  "#e9c98a",
  "#c9a465",
  "#f4efe6",
  "#fbf8f2",
  "#f4d7dc",
  "#efe6f7",
  "#8a6bb8",
  "#243f86",
  "#8ec5ff",
  "#1f6b4a",
  "#7fa77a",
  "#2b2326",
];
export const LIGHT_PALETTE = [
  "#f2b45c",
  "#ffe2a8",
  "#ff9a6b",
  "#ff5a8a",
  "#c9a0ff",
  "#8ec5ff",
  "#7fe0b0",
];

export function Section({
  title,
  children,
  aside,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="border-b border-hairline px-4 py-3.5 last:border-b-0">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-label-2">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** A row of colour dots plus a custom colour well. */
export function Swatches({
  label,
  value,
  onPick,
  colours = PALETTE,
  allowNone,
}: {
  label: string;
  value: string | null;
  onPick: (v: string | null) => void;
  colours?: string[];
  allowNone?: boolean;
}) {
  const custom = value && !colours.includes(value) ? value : null;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {allowNone && (
        <button
          type="button"
          aria-pressed={value === null}
          aria-label={`${label}: none`}
          onClick={() => onPick(null)}
          className="relative h-8 w-8 overflow-hidden rounded-full border border-hairline bg-white transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-night aria-pressed:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <span
            className="absolute left-1/2 top-1/2 h-px w-9 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#c0392b]"
            aria-hidden="true"
          />
        </button>
      )}
      {colours.map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={value === c}
          aria-label={`${label}: ${c}`}
          title={c}
          onClick={() => onPick(c)}
          className="h-8 w-8 rounded-full border border-black/10 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.15)] transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-night aria-pressed:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          style={{ background: c }}
        />
      ))}
      <label
        className={cn(
          "relative grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-dashed border-label-2/60 text-label-2 transition-transform hover:scale-110 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-burgundy",
          custom && "ring-2 ring-night ring-offset-2"
        )}
        style={custom ? { background: custom, borderStyle: "solid" } : {}}
        title="Any colour"
      >
        {!custom && (
          <span aria-hidden="true" className="text-sm leading-none">
            +
          </span>
        )}
        <input
          type="color"
          aria-label={`${label}: any colour`}
          value={value ?? "#ffffff"}
          onChange={(e) => onPick(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

/** Picture tiles for a one-of-many choice. */
export function Tiles<T extends string>({
  label,
  value,
  options,
  onPick,
  cols = 3,
}: {
  label: string;
  value: T | undefined;
  options: { key: T; label: string; icon?: React.ReactNode }[];
  onPick: (v: T) => void;
  cols?: 2 | 3 | 4;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "grid gap-1.5",
        cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-4" : "grid-cols-3"
      )}
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onPick(o.key)}
          className="group flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border border-hairline bg-white px-1 py-2 text-[11px] font-medium leading-tight text-night transition-all hover:-translate-y-px hover:border-night/30 hover:shadow-sm aria-checked:border-night aria-checked:bg-night aria-checked:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          {o.icon && (
            <span className="grid h-7 place-items-center text-night/80 group-aria-checked:text-[#e9c98a]">
              {o.icon}
            </span>
          )}
          <span className="text-center">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Small segmented control. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: T;
  options: { key: T; label: string; icon?: React.ReactNode }[];
  onPick: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex rounded-full bg-[#f1ece4] p-1"
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onPick(o.key)}
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold text-label-2 transition-colors aria-checked:bg-white aria-checked:text-night aria-checked:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A decimal field that commits on blur or Enter (text input so the e2e number field stays unique). */
export function MetreField({
  id,
  label,
  value,
  onCommit,
  min,
  max,
  unit = "m",
}: {
  id: string;
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min: number;
  max: number;
  unit?: string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const v = Number(text.replace(",", "."));
    if (Number.isFinite(v)) onCommit(round2(clamp(v, min, max)));
    else setText(String(value));
  };
  return (
    <div>
      <label htmlFor={id} className="text-[11px] font-semibold text-label-2">
        {label}
      </label>
      <div className="mt-1 flex items-center rounded-lg border border-hairline bg-white pr-2.5 focus-within:border-night">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="h-10 w-full min-w-0 rounded-lg bg-transparent px-2.5 text-base tabular-nums text-night outline-none sm:text-sm"
        />
        <span className="text-xs text-label-2">{unit}</span>
      </div>
    </div>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center justify-between rounded-xl border border-hairline bg-white p-1"
    >
      <button
        type="button"
        aria-label={`Fewer ${label.toLowerCase()}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="grid h-9 w-9 place-items-center rounded-lg text-lg text-night hover:bg-[#f1ece4] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-burgundy"
      >
        −
      </button>
      <span
        className="font-display text-xl font-bold tabular-nums text-night"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`More ${label.toLowerCase()}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="grid h-9 w-9 place-items-center rounded-lg text-lg text-night hover:bg-[#f1ece4] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-burgundy"
      >
        +
      </button>
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
      <span>
        <span className="block text-sm text-night">{label}</span>
        {hint && <span className="block text-[11px] text-label-2">{hint}</span>}
      </span>
      <span className="relative inline-flex">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-[#d9d2c6] transition-colors peer-checked:bg-burgundy peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-burgundy" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

// ---------------------------------------------------------------- pictograms

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** A top view of a table and its chairs, for galleries and table cards. */
export function TableGlyph({
  shape,
  seats,
  size = 28,
  filled = 0,
}: {
  shape: string;
  seats: number;
  size?: number;
  filled?: number;
}) {
  const n = Math.min(seats, 16);
  const dots: { x: number; y: number }[] = [];
  let body: React.ReactNode;
  if (shape === "rectangular" || shape === "head") {
    const w = shape === "head" ? 30 : 26;
    body = (
      <rect x={20 - w / 2} y={15.5} width={w} height={9} rx={1.5} {...stroke} />
    );
    if (shape === "head") {
      for (let i = 0; i < n; i++)
        dots.push({ x: 20 - w / 2 + (w / n) * (i + 0.5), y: 11 });
    } else {
      const front = Math.ceil(n / 2);
      for (let i = 0; i < front; i++)
        dots.push({ x: 20 - w / 2 + (w / front) * (i + 0.5), y: 11 });
      for (let i = 0; i < n - front; i++)
        dots.push({ x: 20 - w / 2 + (w / (n - front)) * (i + 0.5), y: 29 });
    }
  } else {
    const rx = shape === "oval" ? 13 : 9.5;
    const ry = shape === "oval" ? 8 : 9.5;
    body = <ellipse cx={20} cy={20} rx={rx} ry={ry} {...stroke} />;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2 - Math.PI / 2;
      dots.push({
        x: 20 + Math.cos(t) * (rx + 4.5),
        y: 20 + Math.sin(t) * (ry + 4.5),
      });
    }
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      {body}
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={n > 12 ? 1.4 : 1.9}
          fill={i < filled ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1}
        />
      ))}
    </svg>
  );
}

export function ShapeGlyph({
  shape,
  size = 22,
}: {
  shape: string;
  size?: number;
}) {
  const s = { ...stroke, strokeWidth: 1.6 };
  let el: React.ReactNode;
  switch (shape) {
    case "round":
      el = <circle cx={12} cy={12} r={8} {...s} />;
      break;
    case "oval":
      el = <ellipse cx={12} cy={12} rx={9.5} ry={6} {...s} />;
      break;
    case "hexagon":
      el = (
        <polygon
          points="12,3.5 19.5,7.8 19.5,16.2 12,20.5 4.5,16.2 4.5,7.8"
          {...s}
        />
      );
      break;
    case "octagon":
      el = (
        <polygon
          points="8.5,3.5 15.5,3.5 20.5,8.5 20.5,15.5 15.5,20.5 8.5,20.5 3.5,15.5 3.5,8.5"
          {...s}
        />
      );
      break;
    case "heart":
      el = (
        <path
          d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"
          {...s}
        />
      );
      break;
    default:
      el = <rect x={4} y={6} width={16} height={12} rx={1.5} {...s} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {el}
    </svg>
  );
}

export function ChairGlyph({
  type,
  size = 24,
}: {
  type: string;
  size?: number;
}) {
  const s = { ...stroke, strokeWidth: 1.3 };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {type === "covered" ? (
        <>
          <path d="M7 3.5h10v8H7z" {...s} />
          <path d="M6 11.5h12l1 9H5z" {...s} />
          <path d="M8 7.5c2 1.5 6 1.5 8 0" {...s} />
        </>
      ) : type === "ghost" ? (
        <>
          <ellipse
            cx={12}
            cy={7}
            rx={4.5}
            ry={4}
            {...s}
            strokeDasharray="2 1.5"
          />
          <path
            d="M6.5 13h11M7.5 13l-1 7.5M16.5 13l1 7.5"
            {...s}
            strokeDasharray="2 1.5"
          />
        </>
      ) : type === "crossback" ? (
        <>
          <path
            d="M7 3v17.5M17 3v17.5M7 13h10M7 4h10M7.5 4.5l9 8M16.5 4.5l-9 8M7 20.5h0"
            {...s}
          />
        </>
      ) : (
        <>
          <path
            d="M7.5 3v17.5M16.5 3v17.5M7.5 13h9M7.5 4h9M7.5 7h9M7.5 10h9"
            {...s}
          />
          <path d="M9.5 10v3M12 10v3M14.5 10v3M7.5 17h9" {...s} />
        </>
      )}
    </svg>
  );
}

export function CentrepieceGlyph({
  kind,
  size = 24,
}: {
  kind: string;
  size?: number;
}) {
  const s = { ...stroke, strokeWidth: 1.3 };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {kind === "tall" ? (
        <>
          <circle cx={12} cy={6.5} r={4.5} {...s} />
          <path d="M12 11v8M9 21h6M10 11.5h4" {...s} />
        </>
      ) : kind === "low" ? (
        <>
          <path d="M5 17c0-4 3.2-7 7-7s7 3 7 7z" {...s} />
          <path d="M3.5 19.5h17" {...s} />
        </>
      ) : kind === "candles" ? (
        <>
          <path d="M7 20v-7h3v7M11 20V9h3v11M15 20v-5h3v5M4 20.5h16" {...s} />
          <path
            d="M8.5 11c-.8-1 .2-2 0-3M12.5 7c-.8-1 .2-2 0-3M16.5 13c-.8-1 .2-2 0-3"
            {...s}
          />
        </>
      ) : kind === "lanterns" ? (
        <>
          <path d="M8 9h8v11H8zM12 4l5 5H7zM12 4V2.5" {...s} />
          <path d="M12 13c-1 1.2-1 2.6 0 3.5 1-.9 1-2.3 0-3.5z" {...s} />
        </>
      ) : (
        <path d="M5 5l14 14M19 5L5 19" {...s} />
      )}
    </svg>
  );
}
