"use client";

import React, { useEffect, useState } from "react";
import { daysUntil } from "@/lib/format";

interface CountdownStripProps {
  eventDate: string;
}

export function CountdownStrip({ eventDate }: CountdownStripProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    isPast: boolean;
  }>(() => {
    const days = Math.max(0, daysUntil(eventDate));
    return { days, hours: 0, minutes: 0, isPast: daysUntil(eventDate) < 0 };
  });

  useEffect(() => {
    setMounted(true);
    function calculate() {
      const targetTime = new Date(eventDate).getTime();
      const now = Date.now();
      const diffMs = targetTime - now;

      if (isNaN(targetTime) || diffMs <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, isPast: true });
        return;
      }

      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const minutes = totalMinutes % 60;
      const totalHours = Math.floor(totalMinutes / 60);
      const hours = totalHours % 24;
      const days = Math.floor(totalHours / 24);

      setTimeLeft({ days, hours, minutes, isPast: false });
    }

    calculate();
    const interval = setInterval(calculate, 60000);
    return () => clearInterval(interval);
  }, [eventDate]);

  return (
    <div className="bg-paper py-4 px-6 flex items-center justify-around gap-2 text-center border-t border-b border-outline-variant/20">
      <div className="flex flex-col">
        <span
          suppressHydrationWarning
          className="font-serif text-2xl sm:text-3xl text-wine font-semibold"
        >
          {timeLeft.days}
        </span>
        <span className="text-[10px] sm:text-xs uppercase tracking-wider text-secondary font-medium">
          {timeLeft.isPast ? "Days Since" : "Days to Go"}
        </span>
      </div>
      <div className="h-7 w-px bg-outline-variant/30" />
      <div className="flex flex-col">
        <span
          suppressHydrationWarning
          className="font-serif text-2xl sm:text-3xl text-wine font-semibold"
        >
          {mounted ? timeLeft.hours : 0}
        </span>
        <span className="text-[10px] sm:text-xs uppercase tracking-wider text-secondary font-medium">
          Hours
        </span>
      </div>
      <div className="h-7 w-px bg-outline-variant/30" />
      <div className="flex flex-col">
        <span
          suppressHydrationWarning
          className="font-serif text-2xl sm:text-3xl text-wine font-semibold"
        >
          {mounted ? timeLeft.minutes : 0}
        </span>
        <span className="text-[10px] sm:text-xs uppercase tracking-wider text-secondary font-medium">
          Minutes
        </span>
      </div>
    </div>
  );
}
