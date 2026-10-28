"use client";

import React, { useEffect } from "react";
import { Icon } from "@/components/ui/icon";

interface AllRepliesCelebrationProps {
  eventId: string;
  totalParties: number;
  awaitingParties: number;
}

/**
 * When an event reaches awaitingParties === 0 && totalParties > 0:
 * - Fires canvas-confetti once per event (tracked in localStorage under
 *   ariya:celebrated:<eventId>) with disableForReducedMotion: true.
 * - Renders a persistent "All replies in" badge regardless of motion preference.
 */
export function AllRepliesCelebration({
  eventId,
  totalParties,
  awaitingParties,
}: AllRepliesCelebrationProps) {
  const isAllReplied = totalParties > 0 && awaitingParties === 0;

  useEffect(() => {
    if (!isAllReplied || !eventId) return;

    const storageKey = `ariya:celebrated:${eventId}`;
    try {
      if (window.localStorage.getItem(storageKey) === "1") {
        return;
      }
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Ignore storage access errors in restricted browsing modes
    }

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    let cancelled = false;
    import("canvas-confetti")
      .then((mod) => {
        if (cancelled) return;
        const confetti = mod.default;
        confetti({
          particleCount: 48,
          spread: 64,
          origin: { y: 0.65 },
          disableForReducedMotion: true,
          colors: ["#C89B3C", "#E8D2A6", "#6B1E2E", "#1F6B4A"],
        });
      })
      .catch(() => {
        // Non-critical visual enhancement
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, isAllReplied]);

  if (!isAllReplied) return null;

  return (
    <span
      data-testid="all-replies-badge"
      className="inline-flex items-center gap-1 rounded-full bg-rsvp-accepted/12 px-2.5 py-0.5 text-[11px] font-semibold text-rsvp-accepted"
    >
      <Icon name="check_circle" size={13} />
      <span>All replies in</span>
    </span>
  );
}
