"use client";

import React from "react";
import Link from "next/link";
import { Check, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { autoOnboardingAllowed, useOnboarding } from "./OnboardingProvider";
import { firstSteps, type FirstStepsStatus } from "./state";

/**
 * The five things every celebration needs first, ticked from the real plan rather than by hand,
 * each a link to where it is done. Hidden for good once closed, or once all five are done and seen.
 */
export function FirstSteps({
  eventId,
  status,
}: {
  eventId: string;
  status: FirstStepsStatus;
}) {
  const onboarding = useOnboarding();
  const [allowed, setAllowed] = React.useState(false);
  React.useEffect(() => setAllowed(autoOnboardingAllowed()), []);
  if (!onboarding || onboarding.state.firstStepsHidden || !allowed) return null;

  const steps = firstSteps(eventId, status, onboarding.role);
  const done = steps.filter((s) => s.done).length;
  const all = done === steps.length;
  const next = steps.find((s) => !s.done);
  const hide = () => onboarding.update({ firstStepsHidden: true });

  return (
    <section
      data-tour="first-steps"
      aria-labelledby="first-steps-title"
      className="glass relative rounded-[28px] p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink">
            First steps · {done} of {steps.length}
          </p>
          <h2
            id="first-steps-title"
            className="mt-1 font-display text-[1.6rem] italic leading-tight text-night"
          >
            {all ? "All five done. Well done!" : "Get your celebration ready"}
          </h2>
        </div>
        <button
          type="button"
          onClick={hide}
          aria-label={all ? "Close first steps" : "Hide first steps"}
          title={all ? "Close" : "Hide"}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-night/60 hover:bg-night/[0.06] hover:text-night focus-visible:outline-2 focus-visible:outline-burgundy"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-night/10"
        role="progressbar"
        aria-label="First steps done"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={done}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-burgundy to-[#b8864b] motion-safe:transition-[width] motion-safe:duration-700"
          style={{ width: `${(done / steps.length) * 100}%` }}
        />
      </div>

      <ol className="mt-4 grid gap-2 lg:grid-cols-5">
        {steps.map((s, n) => {
          const isNext = s === next;
          return (
            <li key={s.key}>
              <Link
                href={s.href}
                className={cn(
                  "group flex h-full min-h-11 items-center gap-3 rounded-2xl border p-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy lg:flex-col lg:items-start lg:p-4",
                  s.done
                    ? "border-transparent bg-night/[0.03]"
                    : isNext
                      ? "border-burgundy/40 bg-white shadow-[0_10px_28px_-18px_rgba(107,30,46,0.6)]"
                      : "border-hairline bg-white/70 hover:border-night/30"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                    s.done
                      ? "bg-burgundy text-ivory"
                      : isNext
                        ? "border-2 border-burgundy text-burgundy"
                        : "border border-night/25 text-night/60"
                  )}
                >
                  {s.done ? <Check size={14} strokeWidth={3} /> : n + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm font-semibold",
                      s.done
                        ? "text-night/50 line-through decoration-night/30"
                        : "text-night"
                    )}
                  >
                    {s.label}
                    {s.done && <span className="sr-only"> (done)</span>}
                  </span>
                  {!s.done && (
                    <span className="mt-0.5 block text-xs leading-snug text-label-2">
                      {s.hint}
                    </span>
                  )}
                </span>
                {!s.done && (
                  <ChevronRight
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-night/40 transition-transform group-hover:translate-x-0.5 lg:hidden"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
