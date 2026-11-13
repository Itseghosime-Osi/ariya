"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  afterFireworks,
  autoOnboardingAllowed,
  useOnboarding,
} from "./OnboardingProvider";
import type { HostRole } from "./state";

const CHOICES: { role: HostRole; title: string; hint: string }[] = [
  {
    role: "couple",
    title: "My own celebration",
    hint: "A wedding, birthday or family party that is mine.",
  },
  {
    role: "planner",
    title: "Someone else's",
    hint: "I am a planner, or helping a client or family.",
  },
];

/**
 * The first thing a new host sees once they are in: a hello, one question (whose celebration it
 * is, already answered at sign-up and here to confirm), and the way in. With no celebration yet the
 * way in is creating one; with one, it is the tour of its desk.
 */
export function WelcomeCard({
  firstName,
  primaryEventId,
}: {
  firstName?: string | null;
  primaryEventId?: string | null;
}) {
  const onboarding = useOnboarding();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(false);

  // Read when the timer fires: this device's copy of the flags is merged in just after first render.
  const latest = useRef(onboarding);
  latest.current = onboarding;
  const signedIn = Boolean(onboarding);
  useEffect(() => {
    if (!signedIn || !autoOnboardingAllowed()) return;
    setPhone(window.matchMedia("(max-width: 639px)").matches);
    // The sign-up fireworks start as the page paints; the card waits for them to finish.
    const afterSignUp =
      new URL(window.location.href).searchParams.get("welcome") === "1";
    return afterFireworks(
      () => {
        if (!latest.current?.state.welcomed) setOpen(true);
      },
      afterSignUp ? 1200 : 600
    );
  }, [signedIn]);

  if (!onboarding) return null;
  const { role, setRole, update } = onboarding;

  const close = (tour?: "skipped") => {
    setOpen(false);
    update(tour ? { welcomed: true, tour } : { welcomed: true });
  };

  const go = () => {
    close();
    router.push(
      primaryEventId ? `/events/${primaryEventId}?tour=1` : "/events/new"
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        sheet={phone}
        data-testid="welcome-card"
        className={cn(
          "gap-0 overflow-hidden p-0 sm:max-w-[30rem]",
          !phone && "rounded-[28px]"
        )}
      >
        <div className="relative bg-night px-6 pb-6 pt-7 text-ivory">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(233,201,138,0.35),transparent_70%)]"
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
            Welcome to Àríyá
          </p>
          <DialogTitle className="mt-2 font-display text-[2rem] italic leading-tight text-ivory">
            {firstName ? `Hello, ${firstName}.` : "Hello, and welcome."}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm leading-relaxed text-ivory/75">
            Let's get you set up. It takes about a minute, and you can change
            anything later.
          </DialogDescription>
        </div>

        <div className="px-6 pb-6 pt-5">
          <fieldset>
            <legend className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a5b67]">
              Whose celebration are you planning?
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup">
              {CHOICES.map((c) => {
                const on = role === c.role;
                return (
                  <button
                    key={c.role}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setRole(c.role)}
                    className={cn(
                      "min-h-11 rounded-2xl border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
                      on
                        ? "border-burgundy bg-burgundy/[0.06] ring-1 ring-burgundy"
                        : "border-hairline bg-white hover:border-night/40"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                          on ? "border-burgundy" : "border-night/30"
                        )}
                      >
                        {on && (
                          <span className="h-2 w-2 rounded-full bg-burgundy" />
                        )}
                      </span>
                      <span className="text-sm font-semibold text-night">
                        {c.title}
                      </span>
                    </span>
                    <span className="mt-1 block pl-6 text-xs leading-snug text-label-2">
                      {c.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={go}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-burgundy px-5 text-sm font-semibold text-ivory transition-colors hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            {primaryEventId ? "Show me around" : "Create my first celebration"}
          </button>
          <button
            type="button"
            onClick={() => close("skipped")}
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-night/70 hover:text-night focus-visible:outline-2 focus-visible:outline-burgundy"
          >
            I will look around on my own
          </button>
          <p className="mt-2 text-center text-[11px] text-label-2">
            You can take the tour any time from your account menu.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
