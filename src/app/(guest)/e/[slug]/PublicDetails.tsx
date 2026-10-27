import React from "react";
import { formatLagosDate, formatLagosTime } from "@/lib/format";
import { Icon } from "@/components/ui/icon";
import type { PublicCelebration } from "@/features/events/queries";

const DEFAULT_SCHEDULE = [
  {
    time: "13:15 WAT",
    title: "Welcoming Arrival Reception",
    location: "Courtyard & Terrace",
  },
  {
    time: "14:00 WAT",
    title: "Solemnization Ceremony",
    location: "Ceremonial Sanctuary",
  },
  {
    time: "15:30 WAT",
    title: "Celebration Banquet & Toast",
    location: "Grand Ballroom",
  },
];

export function PublicDetails({ event }: { event: PublicCelebration }) {
  const formattedDate = formatLagosDate(event.date);
  const formattedTime = formatLagosTime(event.date);
  const mapQuery = encodeURIComponent(
    `${event.venue}${event.area ? ", " + event.area : ""}`
  );
  const mapUrl = `https://maps.google.com/?q=${mapQuery}`;
  const calStart = new Date(event.date)
    .toISOString()
    .replace(/-|:|\.\d\d\d/g, "");
  const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${calStart}/${calStart}&location=${mapQuery}`;

  const scheduleSlots =
    event.schedule && event.schedule.length > 0
      ? event.schedule
      : DEFAULT_SCHEDULE;

  return (
    <div className="space-y-8">
      {/* Couple Story / Invocation */}
      <section className="text-center max-w-xl mx-auto space-y-3 bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border border-outline-variant/30 shadow-sm">
        <Icon name="favorite" className="text-wine text-2xl mx-auto block" />
        <h2 className="font-serif text-xl sm:text-2xl text-wine font-medium">
          Honoring Our Beloved Guests
        </h2>
        <p className="font-serif text-base text-paper-ink italic leading-relaxed">
          &ldquo;
          {event.description ||
            "We warmly invite our esteemed elders, cherished family, and dear friends to celebrate love, legacy, and joyous beginnings with us in Lagos."}
          &rdquo;
        </p>
        <div className="w-16 h-0.5 bg-gold mx-auto" />
      </section>

      {/* Logistics Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Venue Location Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-wine">
              <Icon name="location_on" className="text-xl" />
            </div>
            <h3 className="font-serif text-lg font-medium text-paper-ink">
              Celebration Venue
            </h3>
            <p className="text-sm text-on-surface-variant font-medium">
              {event.venue}
            </p>
            {event.area && (
              <p className="text-xs text-on-surface-variant">{event.area}</p>
            )}
          </div>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-surface-container text-wine hover:bg-surface-container-high text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-outline-variant/30"
          >
            <Icon name="directions" className="text-sm" />
            <span>Get Directions</span>
          </a>
        </div>

        {/* Date & Schedule Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-wine">
              <Icon name="schedule" className="text-xl" />
            </div>
            <h3 className="font-serif text-lg font-medium text-paper-ink">
              Date &amp; Schedule
            </h3>
            <p className="text-sm text-on-surface-variant font-medium">
              {formattedDate}
            </p>
            <p className="text-xs text-on-surface-variant">
              Prompt arrival requested • {formattedTime}
            </p>
          </div>
          <a
            href={calUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-surface-container text-wine hover:bg-surface-container-high text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-outline-variant/30"
          >
            <Icon name="event" className="text-sm" />
            <span>Add to Calendar</span>
          </a>
        </div>
      </div>

      {/* Venue Ambient Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-sm p-6 sm:p-8 bg-gradient-to-r from-wine to-[#581525] border border-outline-variant/30 text-ivory flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-gold text-xs font-semibold uppercase tracking-wider">
            <Icon name="apartment" className="text-sm" />
            <span>Celebration Grounds</span>
          </div>
          <h4 className="font-serif text-lg sm:text-xl font-medium text-ivory">
            {event.venue}
          </h4>
          <p className="text-xs text-mist font-medium">
            {event.area || "Lagos, Nigeria"}
          </p>
        </div>
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl bg-gold text-night text-xs font-semibold hover:bg-gold/90 transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Icon name="map" className="text-sm" />
          <span>Open Map</span>
        </a>
      </div>

      {/* Order of Events / Schedule */}
      <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border border-outline-variant/30 shadow-sm space-y-4">
        <h3 className="font-serif text-xl text-wine font-medium text-center">
          Order of Events
        </h3>
        <div className="space-y-4 pt-2">
          {scheduleSlots.map((slot, i) => (
            <div
              key={i}
              className="flex items-start gap-4 pb-3 border-b border-outline-variant/20 last:border-0 last:pb-0"
            >
              <span className="text-xs font-semibold text-secondary min-w-[76px] tracking-wide pt-0.5">
                {slot.time}
              </span>
              <div className="space-y-0.5">
                <p className="font-serif text-sm font-medium text-paper-ink">
                  {slot.title}
                </p>
                {slot.location && (
                  <p className="text-xs text-on-surface-variant">
                    {slot.location}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dress Code & Aṣọ-Ẹbí Colors */}
      <section className="p-6 sm:p-8 rounded-2xl bg-paper border border-outline-variant/30 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-wine font-medium">
          <Icon name="palette" className="text-lg" />
          <h3 className="font-serif text-lg text-wine">
            Ceremony Attire &amp; Aṣọ-Ẹbí Colors
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
          {event.dressCode ||
            "In accordance with celebratory tradition, our families invite guests to share in our ceremonial colors: Royal Wine velvet and Champagne Gold accents."}
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-wine shadow-sm" />
            <span className="text-xs font-semibold text-paper-ink">
              Royal Wine
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-gold shadow-sm" />
            <span className="text-xs font-semibold text-paper-ink">
              Champagne Gold
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
