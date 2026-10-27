import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicEventBySlug } from "@/features/events/queries";
import { formatLagosDate, formatLagosTime, daysUntil } from "@/lib/format";
import { Icon } from "@/components/ui/icon";

interface PublicCelebrationPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PublicCelebrationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);

  if (!event) {
    return { title: "Celebration Not Found • Àríyá" };
  }

  return {
    title: `${event.title} • Celebration Suite • Àríyá`,
    description: `Join us in celebrating the nuptials of ${event.couple}. Details, dress code, and guest pass access.`,
  };
}

export default async function PublicCelebrationPage({
  params,
}: PublicCelebrationPageProps) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const daysLeft = daysUntil(event.date);
  const formattedDate = formatLagosDate(event.date);
  const formattedTime = formatLagosTime(event.date);
  const isPast = daysLeft < 0;

  return (
    <div className="min-h-screen bg-[#f8f5ee] flex flex-col justify-between py-12 px-4 sm:px-6">
      <main className="max-w-2xl mx-auto w-full space-y-8">
        {/* Monogram Crest Header */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-wine text-gold shadow-md">
            <span className="font-serif text-2xl font-bold tracking-wider">
              À
            </span>
          </div>
          <p className="text-xs font-semibold tracking-widest uppercase text-wine/80">
            Royal Nuptial Gazette
          </p>
        </header>

        {/* Ceremonial Invitation Hero Card */}
        <article className="bg-[#fcfaf7] border border-[#e8dfcf] rounded-2xl p-8 sm:p-10 shadow-sm space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-wine via-gold to-wine" />

          <section className="text-center space-y-4 pt-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-wine/10 text-wine">
              {isPast
                ? "Celebrated Ceremony"
                : daysLeft === 0
                  ? "Celebration Day"
                  : `${daysLeft} Days to Celebration`}
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-wine font-medium leading-tight">
              {event.title}
            </h1>
            <p className="font-serif text-xl italic text-wine/90">
              The Nuptials of {event.couple}
            </p>
          </section>

          <hr className="border-[#e8dfcf]" />

          {/* Time & Venue Section */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-wine/70 font-semibold block">
                Date & Ceremony
              </span>
              <p className="font-medium text-night text-base">
                {formattedDate}
              </p>
              <p className="text-wine/80">{formattedTime}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-wine/70 font-semibold block">
                Grand Venue
              </span>
              <p className="font-medium text-night text-base">{event.venue}</p>
              {event.area && <p className="text-wine/80">{event.area}</p>}
            </div>
          </section>

          {/* Attire & Traditions */}
          {event.dressCode && (
            <section className="bg-wine/5 rounded-xl p-4 border border-wine/10 space-y-1">
              <span className="text-xs uppercase tracking-wider text-wine font-bold block flex items-center gap-1.5">
                <Icon name="palette" className="text-sm" />
                Dress Code & Aso-Ebi Palette
              </span>
              <p className="text-night text-sm leading-relaxed">
                {event.dressCode}
              </p>
            </section>
          )}

          {/* RSVP Protocol & Access Form (Works 100% without JS) */}
          <section className="bg-[#f5ede0] rounded-xl p-6 border border-[#e0d3be] space-y-4">
            <div className="space-y-1">
              <h2 className="font-serif text-lg font-medium text-wine">
                Personal Invitation Access
              </h2>
              <p className="text-xs text-wine/80">
                Enter the personal invitation code sent to your WhatsApp or
                email to access your pass and RSVP.
              </p>
            </div>

            <form
              action="/rsvp.html"
              method="GET"
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                name="token"
                required
                maxLength={40}
                placeholder="e.g. 7mK9pL2vX4nQ..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-wine/20 bg-white text-night text-sm font-mono placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-wine/40"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-wine hover:bg-wine/90 text-ivory text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Access Pass</span>
                <Icon name="arrow_forward" className="text-base" />
              </button>
            </form>
          </section>
        </article>
      </main>

      <footer className="text-center text-xs text-stone-700 font-medium pt-8">
        <p>Àríyá • Bespoke African Ceremonies & Wedding Suite</p>
      </footer>
    </div>
  );
}
