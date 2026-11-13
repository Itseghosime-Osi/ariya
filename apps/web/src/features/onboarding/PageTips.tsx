"use client";

import React from "react";
import { Lightbulb } from "lucide-react";
import { autoOnboardingAllowed, useOnboarding } from "./OnboardingProvider";

/**
 * Three short things to know about a page, shown the first time a host opens it and gone for good
 * once dismissed. The same card as the seating studio's "Three things to know", for every page
 * that needs one.
 */
export function PageTips({
  tipKey,
  title = "Three things to know",
  items,
  forced = false,
  onDismiss,
}: {
  tipKey: string;
  title?: string;
  items: React.ReactNode[];
  /** Shown again on request (the Help button), even after it was dismissed. */
  forced?: boolean;
  onDismiss?: () => void;
}) {
  const onboarding = useOnboarding();
  const [allowed, setAllowed] = React.useState(false);
  React.useEffect(() => setAllowed(autoOnboardingAllowed()), []);
  if (!onboarding) return null;
  if (!forced && (!allowed || onboarding.state.tips?.includes(tipKey)))
    return null;

  return (
    <aside
      data-testid={`page-tips-${tipKey}`}
      aria-labelledby={`tips-${tipKey}`}
      className="mb-5 rounded-[22px] border border-gold-ink/25 bg-[#f6f1e8] p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-night text-[#e9c98a]">
          <Lightbulb size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id={`tips-${tipKey}`}
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink"
          >
            {title}
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm leading-snug text-night">
            {items.map((item, n) => (
              <li key={n} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-burgundy"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => {
            onboarding.update({ tips: [tipKey] });
            onDismiss?.();
          }}
          className="min-h-11 shrink-0 rounded-full border border-hairline bg-white px-4 text-xs font-semibold text-night hover:border-night/40 focus-visible:outline-2 focus-visible:outline-burgundy"
        >
          Got it
        </button>
      </div>
    </aside>
  );
}
