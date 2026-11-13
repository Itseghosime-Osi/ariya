"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFirstStepsAction } from "./actions";
import { autoOnboardingAllowed, useOnboarding } from "./OnboardingProvider";
import { firstSteps, type FirstStepsStatus } from "./state";

/**
 * The way back to First steps from any page of a celebration: a small pill with how many are done,
 * opening the list with a link to each. Gone once all five are done or the card was hidden.
 */
export function FirstStepsPill({
  eventId,
  pathname,
}: {
  eventId: string;
  pathname: string;
}) {
  const onboarding = useOnboarding();
  const [status, setStatus] = useState<FirstStepsStatus | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  // Hidden outside the signed-in app, or once the host closed First steps.
  const hidden = onboarding ? Boolean(onboarding.state.firstStepsHidden) : true;

  useEffect(() => setAllowed(autoOnboardingAllowed()), []);

  // Fresh on every page, so a step done here ticks on the way out.
  useEffect(() => {
    if (hidden || !allowed) return;
    let live = true;
    getFirstStepsAction(eventId)
      .then((s) => live && setStatus(s))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [eventId, pathname, hidden, allowed]);

  useEffect(() => setOpen(false), [pathname]);

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

  if (!onboarding || hidden || !allowed || !status) return null;
  const steps = firstSteps(eventId, status, onboarding.role);
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <div ref={box} className="relative mb-4 flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        data-testid="first-steps-pill"
        className="inline-flex min-h-11 items-center gap-2.5 rounded-full border border-gold-ink/25 bg-white/70 pl-2 pr-3.5 text-sm font-semibold text-night backdrop-blur-sm transition-colors hover:border-gold-ink/60 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      >
        <span
          aria-hidden="true"
          className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-burgundy"
          style={{
            background: `conic-gradient(#6b1e2e ${(done / steps.length) * 360}deg, rgba(28,19,23,0.1) 0)`,
          }}
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white">
            {done}
          </span>
        </span>
        <span>
          First steps
          <span className="font-normal text-label-2">
            {" "}
            · {done} of {steps.length}
          </span>
        </span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          id={listId}
          className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[min(22rem,calc(100vw-2rem))] rounded-[22px] border border-gold-ink/25 bg-ivory/97 p-2 shadow-[0_24px_60px_-24px_rgba(28,7,13,0.55)] backdrop-blur-md"
        >
          <ol>
            {steps.map((s, n) => (
              <li key={s.key}>
                <Link
                  href={s.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center gap-3 rounded-2xl px-2.5 py-2 hover:bg-white focus-visible:outline-2 focus-visible:outline-burgundy"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                      s.done
                        ? "bg-burgundy text-ivory"
                        : "border border-night/25 text-night/60"
                    )}
                  >
                    {s.done ? <Check size={12} strokeWidth={3} /> : n + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      s.done
                        ? "text-night/50 line-through decoration-night/30"
                        : "text-night"
                    )}
                  >
                    {s.label}
                    {s.done && <span className="sr-only"> (done)</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <Link
            href={`/events/${eventId}`}
            onClick={() => setOpen(false)}
            className="mt-1 flex min-h-11 items-center justify-center rounded-full text-xs font-semibold text-burgundy hover:bg-white focus-visible:outline-2 focus-visible:outline-burgundy"
          >
            Back to the celebration desk
          </Link>
        </div>
      )}
    </div>
  );
}
