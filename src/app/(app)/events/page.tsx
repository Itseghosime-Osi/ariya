import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { EventsHome } from "@/features/events/components/CelebrationsList";
import { getUserEvents } from "@/features/events/queries";
import { getCrossEventHomeData } from "@/features/events/data/get-coming-up";
import {
  partitionEvents,
  pickHeroEvent,
} from "@/features/events/lib/select-events";
import { buildComingUp } from "@/features/events/lib/coming-up";
import { buildNeedsAttention } from "@/features/events/lib/needs-attention";
import { getCurrentProfile, getCurrentUser } from "@/features/auth/queries";

export const metadata = {
  title: "Your events • Àríyá",
  description: "Manage your upcoming and past celebrations on Àríyá.",
};

function extractFirstName(
  fullName?: string | null,
  email?: string | null
): string | null {
  if (fullName?.trim()) {
    const first = fullName.trim().split(/\s+/)[0];
    if (first && !/^user$/i.test(first)) {
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
  }
  if (email?.trim()) {
    const local = email.trim().split("@")[0]?.trim();
    if (local && !/^user(_\d+)?$/i.test(local)) {
      const clean = local.split(/[._+-]/)[0] || local;
      if (clean && !/^user$/i.test(clean)) {
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      }
    }
  }
  return null;
}

export default async function EventsPage() {
  const [events, user, profile] = await Promise.all([
    getUserEvents(),
    getCurrentUser(),
    getCurrentProfile(),
  ]);

  const { upcoming, past } = partitionEvents(events);
  const heroEvent = pickHeroEvent(upcoming);
  const primaryEvent = heroEvent ?? past[0] ?? events[0] ?? null;

  const { vendorTasks, invitedCountByEventId, recentReplies } =
    await getCrossEventHomeData(events);

  const comingUpItems = buildComingUp({
    upcomingEvents: upcoming,
    vendorTasks,
    windowDays: 21,
  });

  const needsAttentionItems = buildNeedsAttention(upcoming, {
    invitedCountByEventId,
  });

  const switcherEvents = [...upcoming, ...past].map((item) => ({
    id: item.event.id,
    title: item.event.title,
    date: item.event.date,
    couple: item.event.couple,
  }));

  const metaFullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const firstName = extractFirstName(
    profile?.full_name ?? metaFullName,
    profile?.email ?? user?.email
  );

  return (
    <AppShell
      primaryEventId={primaryEvent?.event.id}
      eventTitle={primaryEvent?.event.title}
      eventDate={primaryEvent?.event.date}
      daysAway={primaryEvent?.metrics.daysAway}
      userEmail={user?.email}
      events={switcherEvents}
      showFloatingNewEvent
    >
      <EventsHome
        events={events}
        comingUpItems={comingUpItems}
        needsAttentionItems={needsAttentionItems}
        recentReplies={recentReplies}
        firstName={firstName}
        now={Date.now()}
      />
    </AppShell>
  );
}
