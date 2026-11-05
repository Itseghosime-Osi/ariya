import React from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPublicEventBySlug } from "@/features/events/queries";
import { ExpiredEventCard } from "@/features/events/components/ExpiredEventCard";
import { FilmGate } from "@/features/event-film/FilmGate";
import { FilmFinale } from "@/features/event-film/components/FilmFinale";
import { NotLiveCard } from "@/features/event-film/components/NotLiveCard";
import { TestModeBanner } from "@/features/event-film/components/TestModeBanner";
import { readFilmDesign } from "@/features/event-film/design";
import { isEventTeamMember } from "@/features/event-film/queries";
import { inviteAccess } from "@/features/event-film/visibility";
import { PublicHero } from "./PublicHero";
import { PublicDetails } from "./PublicDetails";
import { PublicPassLookup } from "./PublicPassLookup";

interface PublicCelebrationPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ token?: string }>;
}

export async function generateMetadata({
  params,
}: PublicCelebrationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);

  if (!event) {
    return { title: "Celebration Not Found • Àríyá" };
  }

  if (event.expired) {
    return {
      title: "This celebration has ended • Àríyá",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${event.title} • Àríyá`,
    alternates: { canonical: `/e/${encodeURIComponent(slug)}` },
    description: `Join us in celebrating ${event.couple}. Order of events, venue directions, attire, and guest pass access.`,
  };
}

export default async function PublicCelebrationPage({
  params,
  searchParams,
}: PublicCelebrationPageProps) {
  const [{ slug }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as { token?: string }),
  ]);

  if (query.token?.trim()) {
    redirect(`/i/${encodeURIComponent(query.token.trim())}`);
  }

  const event = await getPublicEventBySlug(slug);
  if (!event) {
    notFound();
  }

  if (event.expired) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-surface px-4 py-8 sm:px-6">
        <main className="mx-auto w-full max-w-xl">
          <ExpiredEventCard title={event.title} couple={event.couple} />
        </main>
      </div>
    );
  }

  // In test mode only the celebration's own team can open the page.
  const access = inviteAccess({
    live: event.invitationLive !== false,
    isTeamMember:
      event.invitationLive === false
        ? await isEventTeamMember(event.id)
        : false,
  });
  if (access === "not-live") {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-surface px-4 py-8 sm:px-6">
        <main className="mx-auto w-full max-w-xl">
          <NotLiveCard title={event.title} couple={event.couple} />
        </main>
      </div>
    );
  }

  const film = readFilmDesign(event.filmDesign);

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between py-8 px-4 sm:px-6 antialiased">
      {film.enabled && (
        <FilmGate
          design={film}
          storageKey={`film:${event.id}`}
          event={{
            couple: event.couple,
            title: event.title,
            date: event.date,
            venue: event.venue,
            area: event.area,
            dressCode: event.dressCode,
          }}
          ctaLabel="See the details"
          finale={
            <FilmFinale
              event={{
                title: event.title,
                couple: event.couple,
                date: event.date,
                venue: event.venue,
                area: event.area,
                dressCode: event.dressCode,
                rsvpBy: event.rsvpBy,
                theme: event.invitationTheme,
                headline: event.invitationHeadline,
                subheadline: event.invitationSubheadline,
                message: event.invitationMessage,
              }}
            />
          }
        />
      )}
      <main className="max-w-2xl mx-auto w-full space-y-8">
        {access === "test-preview" && <TestModeBanner eventId={event.id} />}
        {/* Monogram Brandmark */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-wine text-gold shadow-md">
            <span className="font-serif text-2xl font-bold">À</span>
          </div>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-wine">
            Àríyá
          </p>
        </header>

        {/* Hero Section */}
        <PublicHero event={event} />

        {/* Event Story, Logistics, Schedule & Attire */}
        <PublicDetails event={event} />

        {/* Guest Pass Lookup & Confirmation */}
        <PublicPassLookup event={event} />
      </main>

      <footer className="text-center text-xs text-on-surface-variant font-medium pt-8 pb-4">
        <p>Àríyá • Event Guest &amp; RSVP Suite</p>
      </footer>
    </div>
  );
}
