import React from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPublicEventBySlug } from "@/features/events/queries";
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

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between py-8 px-4 sm:px-6 antialiased">
      <main className="max-w-2xl mx-auto w-full space-y-8">
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
