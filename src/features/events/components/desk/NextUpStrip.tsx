"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { Icon } from "@/components/ui/icon";
import type { NextAction } from "../../lib/overview-insights";

const TONE: Record<NextAction["tone"], { dot: string; label: string }> = {
  urgent: { dot: "bg-[#c1283d]", label: "Needs you" },
  steady: { dot: "bg-[#b8864b]", label: "Next up" },
  celebrate: { dot: "bg-[#2e6a4f]", label: "All good" },
};

/**
 * What to do next, in one clean line: the most pressing step with its reason, and small arrows to
 * leaf through whatever else is waiting.
 */
export function NextUpStrip({ actions }: { actions: NextAction[] }) {
  const [i, setI] = useState(0);
  const a = actions[Math.min(i, actions.length - 1)];
  if (!a) return null;
  const tone = TONE[a.tone];
  const many = actions.length > 1;

  return (
    <section
      aria-label="Next up"
      className="glass flex items-center gap-3 rounded-full py-2 pl-5 pr-2 sm:gap-4"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${tone.dot}`}
        />
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${tone.dot}`}
        />
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={a.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-3"
          >
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-gold-ink">
              {tone.label}
              {many && (
                <span className="ml-1.5 tabular-nums text-label-2">
                  {i + 1}/{actions.length}
                </span>
              )}
            </span>
            <span className="truncate font-semibold text-night">{a.title}</span>
            <span className="hidden truncate text-sm text-label-2 xl:inline">
              {a.reason}
            </span>
          </m.div>
        </AnimatePresence>
      </div>
      {many && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() =>
              setI((v) => (v - 1 + actions.length) % actions.length)
            }
            aria-label="Previous suggestion"
            className="grid h-9 w-9 place-items-center rounded-full text-label-2 transition-colors hover:bg-surface-container hover:text-night"
          >
            <Icon name="chevron_left" size={18} />
          </button>
          <button
            type="button"
            onClick={() => setI((v) => (v + 1) % actions.length)}
            aria-label="Next suggestion"
            className="grid h-9 w-9 place-items-center rounded-full text-label-2 transition-colors hover:bg-surface-container hover:text-night"
          >
            <Icon name="chevron_right" size={18} />
          </button>
        </div>
      )}
      <Link
        href={a.href}
        title={a.reason}
        className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-burgundy px-4 text-sm font-semibold text-white transition-colors hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      >
        <span className="hidden sm:inline">{a.cta}</span>
        <Icon name="arrow_forward" size={16} />
        <span className="sr-only sm:hidden">{a.cta}</span>
      </Link>
    </section>
  );
}
