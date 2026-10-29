"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * A choice you tap. Built on a real radio input, so arrow keys, focus and screen readers behave;
 * the pill beside it is just the look. 44px tall so a thumb finds it.
 */
export function Chip({
  name,
  value,
  checked,
  onChange,
  children,
  className,
  testId,
  index = 0,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  testId?: string;
  /** Position in its row, so a group rises in one chip after another. */
  index?: number;
}) {
  return (
    <label
      className="wiz-rise relative inline-flex"
      style={{ "--i": index } as React.CSSProperties}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        data-testid={testId}
        className="peer sr-only"
      />
      <span
        className={cn(
          "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-gold-ink/25 bg-white/70 px-4 py-2 text-sm font-semibold text-night transition-[background-color,border-color,color,transform] duration-150 hover:border-gold-ink/60 active:scale-[0.97] peer-checked:border-burgundy peer-checked:bg-burgundy peer-checked:text-ivory peer-checked:animate-[wiz-pop_320ms_var(--ease-out)] motion-reduce:peer-checked:animate-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-ink",
          className
        )}
      >
        {children}
      </span>
    </label>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink",
        className
      )}
    >
      {children}
    </span>
  );
}

export const fieldClass =
  "w-full min-h-12 rounded-2xl border border-gold-ink/25 bg-white/80 px-4 py-3 text-base text-night shadow-inner outline-none transition-colors placeholder:text-label-3 hover:border-gold-ink/50 focus:border-burgundy focus:bg-white focus-visible:ring-2 focus-visible:ring-burgundy/30";
