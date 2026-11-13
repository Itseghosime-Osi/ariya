"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  afterFireworks,
  autoOnboardingAllowed,
  useOnboarding,
} from "./OnboardingProvider";
import { tourStops, type TourStop } from "./state";

const CARD_W = 340;
const GAP = 14;

function visible(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const s = getComputedStyle(el);
  return (
    s.visibility !== "hidden" &&
    s.display !== "none" &&
    Number(s.opacity) > 0.05
  );
}

function find(stop: TourStop): HTMLElement | null {
  for (const sel of stop.targets) {
    for (const el of Array.from(document.querySelectorAll(sel)))
      if (visible(el)) return el;
  }
  return null;
}

/**
 * A short tour of the celebration desk: a gold ring round the real control, and a card beside it
 * saying what it is for. On a phone the card sits above the dock like the Create sheet. It never
 * blocks the page: the dimming lets clicks through, and Esc or Skip ends it.
 */
export function DashboardTour({ created = false }: { created?: boolean }) {
  const onboarding = useOnboarding();
  const [stops, setStops] = useState<TourStop[] | null>(null);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [phone, setPhone] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const role = onboarding?.role ?? "couple";
  // Read when the timer fires, not at first render: this device's own copy of the flags is merged
  // in just after, and a reload that beat the account's save must still find the tour seen.
  const latest = useRef(onboarding);
  latest.current = onboarding;

  // Asked for by ?tour=1, from the welcome card or the account menu. Watched rather than read once:
  // "Show me around" on the desk already open lands on the same page, which does not remount.
  const searchParams = useSearchParams();
  const asked = searchParams?.get("tour") === "1";
  const signedIn = Boolean(onboarding);

  // Whether a tour is on screen, so a second start (the address tidied, the role read) cannot
  // send it back to step one.
  const running = useRef(false);
  running.current = stops !== null;

  // Start: asked for, or the first visit to a desk after the welcome.
  useEffect(() => {
    if (!signedIn || running.current) return;
    if (!asked && !autoOnboardingAllowed()) return;
    return afterFireworks(
      () => {
        const now = latest.current?.state;
        if (running.current) return;
        if (!asked && (!now?.welcomed || now.tour !== undefined)) return;
        const found = tourStops(latest.current?.role ?? role).filter((s) =>
          find(s)
        );
        if (found.length) {
          running.current = true;
          setI(0);
          setStops(found);
        }
        // Tidy the address only now: removing ?tour=1 re-runs this effect, which would otherwise
        // have cancelled the start it was waiting for.
        if (asked) {
          const url = new URL(window.location.href);
          url.searchParams.delete("tour");
          window.history.replaceState(
            null,
            "",
            url.pathname + url.search + url.hash
          );
        }
      },
      // A new celebration's fireworks are still starting when the page first paints.
      created ? 1200 : 700
    );
  }, [asked, signedIn, created, role]);

  const stop = stops?.[i] ?? null;

  const measure = useCallback(() => {
    if (!stop) return;
    const el = find(stop);
    setRect(el ? el.getBoundingClientRect() : null);
    setPhone(window.matchMedia("(max-width: 767px)").matches);
  }, [stop]);

  useLayoutEffect(() => {
    if (!stop) return;
    const el = find(stop);
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    el?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
    measure();
    const t = window.setTimeout(measure, 450);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    heading.current?.focus({ preventScroll: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [stop, measure]);

  const end = useCallback(
    (how: "done" | "skipped") => {
      setStops(null);
      onboarding?.update({ tour: how });
    },
    [onboarding]
  );

  useEffect(() => {
    if (!stops) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end("skipped");
      else if (e.key === "ArrowRight")
        setI((n) => Math.min(n + 1, stops.length - 1));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stops, end]);

  if (!stops || !stop) return null;
  const last = i === stops.length - 1;

  // Where the card goes: beside a target in the sidebar, below or above anything else, clamped to
  // the screen. On a phone it is a sheet above the dock.
  const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  let pos: React.CSSProperties;
  if (phone || !rect) {
    pos = {
      left: 12,
      right: 12,
      bottom: "calc(env(safe-area-inset-bottom) + 6.75rem)",
    };
  } else if (rect.right < 340 && rect.left < 120) {
    pos = {
      left: rect.right + GAP,
      top: Math.max(16, Math.min(rect.top, vh - 280)),
      width: CARD_W,
    };
  } else {
    const below = rect.bottom + GAP + 230 < vh;
    const left = Math.max(16, Math.min(rect.left, vw - CARD_W - 16));
    pos = below
      ? { left, top: rect.bottom + GAP, width: CARD_W }
      : { left, bottom: vh - rect.top + GAP, width: CARD_W };
  }

  const pad = 6;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60]"
      data-testid="dashboard-tour"
    >
      {rect && (
        <div
          aria-hidden="true"
          className="absolute rounded-2xl border-2 border-gold shadow-[0_0_0_9999px_rgba(28,19,23,0.42),0_0_28px_rgba(233,201,138,0.55)] motion-safe:transition-all motion-safe:duration-300"
          style={{
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
          }}
        />
      )}
      <div
        ref={card}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="pointer-events-auto absolute rounded-[24px] border border-gold-ink/25 bg-ivory/97 p-5 text-night shadow-[0_24px_60px_-24px_rgba(28,7,13,0.55)] backdrop-blur-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
        style={pos}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink"
          aria-live="polite"
        >
          Step {i + 1} of {stops.length}
        </p>
        <h2
          id="tour-title"
          ref={heading}
          tabIndex={-1}
          className="mt-1.5 font-display text-[1.45rem] italic leading-tight text-night outline-none"
        >
          {stop.title}
        </h2>
        <p
          id="tour-body"
          className="mt-1.5 text-sm leading-relaxed text-night/75"
        >
          {phone && stop.phoneBody ? stop.phoneBody : stop.body}
        </p>
        <div className="mt-3 flex gap-1" aria-hidden="true">
          {stops.map((s, n) => (
            <span
              key={s.key}
              className={`h-1 flex-1 rounded-full ${n <= i ? "bg-burgundy" : "bg-night/10"}`}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => end("skipped")}
            className="mr-auto min-h-11 rounded-full px-2 text-sm font-semibold text-night/60 hover:text-night focus-visible:outline-2 focus-visible:outline-burgundy"
          >
            Skip tour
          </button>
          {i > 0 && (
            <button
              type="button"
              onClick={() => setI(i - 1)}
              className="min-h-11 rounded-full border border-hairline bg-white px-4 text-sm font-semibold text-night hover:border-night/40 focus-visible:outline-2 focus-visible:outline-burgundy"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (last ? end("done") : setI(i + 1))}
            className="min-h-11 rounded-full bg-burgundy px-5 text-sm font-semibold text-ivory hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            {last ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
