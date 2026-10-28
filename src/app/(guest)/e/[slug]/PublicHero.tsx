import React from "react";
import Image from "next/image";
import type { PublicCelebration } from "@/features/events/queries";
import { isValidCoverImageUrl } from "@/features/events/cover-image";
import { CountdownStrip } from "./CountdownStrip";

interface PublicHeroProps {
  event: PublicCelebration;
}

export function PublicHero({ event }: PublicHeroProps) {
  const hasCover = isValidCoverImageUrl(event.coverImageUrl);

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
      <div
        className={`relative w-full ${
          hasCover
            ? "h-80 sm:h-96 md:h-[420px]"
            : "py-14 sm:py-20 bg-gradient-to-br from-wine via-[#4a101d] to-night"
        } flex items-end overflow-hidden`}
      >
        {hasCover && event.coverImageUrl && (
          <>
            <Image
              src={event.coverImageUrl}
              alt={event.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-night via-night/60 to-transparent" />
          </>
        )}

        <div className="relative z-10 p-6 sm:p-8 w-full text-ivory space-y-2">
          <span className="text-gold text-xs font-semibold uppercase tracking-widest block drop-shadow">
            You&apos;re invited
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-ivory font-medium leading-tight drop-shadow-md">
            {event.title}
          </h1>
          <p className="font-serif text-base sm:text-lg italic text-ivory/90 drop-shadow">
            The Celebration of {event.couple}
          </p>
        </div>
      </div>

      {/* Countdown Strip */}
      <CountdownStrip eventDate={event.date} />
    </div>
  );
}
