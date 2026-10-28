import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { NextAction } from "../../lib/overview-insights";

const TONE = {
  urgent: {
    chip: "bg-[#ffdad6] text-[#93000a]",
    label: "Needs you now",
    icon: "error" as const,
  },
  steady: {
    chip: "bg-[#f3e9d6] text-[#593d08]",
    label: "Next best step",
    icon: "arrow_forward" as const,
  },
  celebrate: {
    chip: "bg-[#e4eee6] text-[#1f4d36]",
    label: "On track",
    icon: "check_circle" as const,
  },
};

/** One thing to do next, with the reason it matters, and a single button. */
export function NextActionCard({ action }: { action: NextAction }) {
  const tone = TONE[action.tone];
  return (
    <section
      aria-labelledby="next-action-title"
      className="bento-card relative flex flex-col gap-4 overflow-hidden p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div
        className="weave pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-[0.07] [mask-image:linear-gradient(to_left,#000,transparent)]"
        aria-hidden="true"
      />
      <div className="relative flex min-w-0 items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#1c070d] text-[#e9c98a] shadow-[0_8px_20px_-10px_rgba(28,7,13,0.7)]">
          <Icon name={tone.icon} size={20} />
        </span>
        <div className="min-w-0">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${tone.chip}`}
          >
            {tone.label}
          </span>
          <h2
            id="next-action-title"
            className="mt-1.5 font-display text-xl font-bold text-night"
          >
            {action.title}
          </h2>
          <p className="mt-0.5 text-sm text-label-2">{action.reason}</p>
        </div>
      </div>
      <Link
        href={action.href}
        className="relative inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 self-start rounded-full bg-burgundy px-5 text-sm font-semibold text-white transition-colors hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy sm:self-center"
      >
        {action.cta}
        <Icon name="arrow_forward" size={16} />
      </Link>
    </section>
  );
}
