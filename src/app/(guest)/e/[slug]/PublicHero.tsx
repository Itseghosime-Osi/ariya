import React from "react";
import Image from "next/image";
import { daysUntil } from "@/lib/format";
import type { PublicCelebration } from "@/features/events/queries";

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80";

interface PublicHeroProps {
  event: PublicCelebration;
}

export function PublicHero({ event }: PublicHeroProps) {
  const daysLeft = daysUntil(event.date);
  const isPast = daysLeft < 0;

  return (
    <div className="w-full overflow-hidden rounded-2xl shadow-xl border border-outline-variant/30 bg-surface-container-lowest">
      {/* Top Banner */}
      <div className="w-full bg-wine text-ivory py-2.5 px-6 flex items-center justify-between text-xs tracking-wider uppercase font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gold" />
          <span>Ceremonial Invitation</span>
        </div>
        <span className="text-gold hidden sm:inline">Lagos • 2026</span>
      </div>

      {/* Hero Media Banner */}
      <div className="relative w-full h-80 sm:h-96 md:h-[420px] flex items-end">
        <Image
          src={event.coverImageUrl || DEFAULT_COVER_IMAGE}
          alt={event.title}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 800px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/60 to-transparent" />

        <div className="relative z-10 p-6 sm:p-8 w-full text-ivory space-y-2">
          <span className="text-gold text-xs font-semibold uppercase tracking-widest block drop-shadow">
            Cordially Request Your Honour
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-ivory font-medium leading-tight drop-shadow-md">
            {event.title}
          </h1>
          <p className="font-serif text-base sm:text-lg italic text-mist drop-shadow">
            The Nuptials of {event.couple}
          </p>
        </div>
      </div>

      {/* Countdown Strip */}
      <div className="bg-paper py-4 px-6 flex items-center justify-around gap-2 text-center border-t border-b border-outline-variant/20">
        <div className="flex flex-col">
          <span className="font-serif text-2xl sm:text-3xl text-wine font-semibold">
            {isPast ? 0 : Math.max(0, daysLeft)}
          </span>
          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-secondary font-medium">
            {isPast ? "Days Since" : "Days to Go"}
          </span>
        </div>
        <div className="h-7 w-px bg-outline-variant/30" />
        <div className="flex flex-col">
          <span className="font-serif text-2xl sm:text-3xl text-wine font-semibold">
            {isPast ? 0 : 14}
          </span>
          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-secondary font-medium">
            Hours
          </span>
        </div>
        <div className="h-7 w-px bg-outline-variant/30" />
        <div className="flex flex-col">
          <span className="font-serif text-2xl sm:text-3xl text-wine font-semibold">
            {isPast ? 0 : 30}
          </span>
          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-secondary font-medium">
            Minutes
          </span>
        </div>
      </div>
    </div>
  );
}
