import React from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { GuestRegistryView } from "@/features/guests/components/GuestRegistryView";
import { getEventById } from "@/features/events/queries";
import {
  getEventGuests,
  getGuestFilterOptions,
  getGuestOverviewStats,
} from "@/features/guests/queries";
import { getCurrentUser } from "@/features/auth/queries";
import type { GuestFilterState } from "@/features/guests/types";

interface GuestPageProps {
  params: Promise<{
    eventId: string;
  }>;
  searchParams: Promise<{
    search?: string;
    side?: string;
    group?: string;
    rsvpStatus?: "all" | "accepted" | "declined" | "pending";
    seatedStatus?: "all" | "seated" | "unseated";
    vip?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export async function generateMetadata({ params }: GuestPageProps) {
  const { eventId } = await params;
  const data = await getEventById(eventId);
  return {
    title: `Guest Registry • ${data?.event.title || "Celebration Desk"} • Àríyá`,
    description:
      "Curate attendance, manage party sizes, and generate unique digital RSVP invitations",
  };
}

export default async function GuestRegistryPage({
  params,
  searchParams,
}: GuestPageProps) {
  const { eventId } = await params;
  const search = await searchParams;

  const page = Math.max(1, Number(search.page) || 1);
  const pageSize = Math.max(5, Math.min(100, Number(search.pageSize) || 25));

  const filterState: GuestFilterState = {
    search: search.search || "",
    side: search.side || "all",
    group: search.group || "all",
    rsvpStatus: search.rsvpStatus || "all",
    seatedStatus: search.seatedStatus || "all",
    isVip: search.vip ? search.vip === "true" : undefined,
    page,
    pageSize,
  };

  const [eventData, user, filterGroups, stats, guestList] = await Promise.all([
    getEventById(eventId),
    getCurrentUser(),
    getGuestFilterOptions(eventId),
    getGuestOverviewStats(eventId),
    getEventGuests(eventId, filterState),
  ]);

  if (!eventData) {
    notFound();
  }

  return (
    <AppShell
      eventId={eventData.event.id}
      eventTitle={eventData.event.title}
      eventDate={eventData.event.date}
      daysAway={eventData.metrics.daysAway}
      userEmail={user?.email}
    >
      <GuestRegistryView
        eventId={eventId}
        eventName={eventData.event.title}
        initialGuests={guestList.guests}
        totalGuests={guestList.totalCount}
        stats={stats}
        availableGroups={filterGroups}
        initialPage={page}
        initialPageSize={pageSize}
        initialFilters={filterState}
      />
    </AppShell>
  );
}
