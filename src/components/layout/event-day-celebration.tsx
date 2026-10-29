"use client";

import { useEffect } from "react";
import { getLagosDateKey } from "@/lib/format";
import type { SwitcherEvent } from "./nav-items";

/**
 * The day itself. Open the app on the day of one of your celebrations and the sky lights up: the
 * biggest show Àríyá has, with confetti from both sides. It plays once per browser session for each
 * celebration, and not on the page that has just launched one (that one has its own finale).
 */
export function EventDayCelebration({ events }: { events: SwitcherEvent[] }) {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("created")) return;
    const today = getLagosDateKey(new Date());
    const tonight = events.find((e) => getLagosDateKey(e.date) === today);
    if (!tonight || !today) return;
    const key = `ariya:eventday:${tonight.id}:${today}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage unavailable: celebrate anyway */
    }
    let stop = () => {};
    let cancelled = false;
    void import("@/lib/fireworks").then(({ startFireworks }) => {
      if (cancelled) return;
      stop = startFireworks({
        scale: "eventDay",
        kicker: "Today is the day",
        caption: tonight.couple?.trim() || tonight.title,
      });
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [events]);

  return null;
}
