import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import type { SwitcherEvent } from "@/components/layout/nav-items";
import { countPendingProposals } from "@/features/approvals/queries";
import { getCurrentUser } from "@/features/auth/queries";
import { readOnboarding, readRole } from "@/features/onboarding/state";
import { getArchivedEvents, getUserEvents } from "@/features/events/queries";
import {
  partitionEvents,
  pickHeroEvent,
} from "@/features/events/lib/select-events";

/**
 * The signed-in workspace. The shell (sidebar, top bar, phone dock) renders
 * here once and persists across navigation; pages render only their content,
 * and this group's loading/error boundaries swap just the content area.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Both queries are wrapped in React cache(), so pages that need them too
  // share the same request-scoped result.
  const [user, events, archived, pendingProposals] = await Promise.all([
    getCurrentUser(),
    getUserEvents(),
    getArchivedEvents(),
    countPendingProposals(),
  ]);

  const { upcoming, past } = partitionEvents(events);
  const primaryEvent = pickHeroEvent(upcoming) ?? past[0] ?? events[0] ?? null;

  const switcherEvents: SwitcherEvent[] = [...upcoming, ...past].map(
    (item) => ({
      id: item.event.id,
      title: item.event.title,
      date: item.event.date,
      couple: item.event.couple,
    })
  );

  const archivedEvents: SwitcherEvent[] = archived.map((item) => ({
    id: item.event.id,
    title: item.event.title,
    date: item.event.date,
    couple: item.event.couple,
  }));

  const fullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  const firstName = fullName.split(/\s+/)[0] || null;

  return (
    <AppShell
      userEmail={user?.email}
      firstName={firstName}
      onboarding={readOnboarding(user?.user_metadata)}
      role={readRole(user?.user_metadata)}
      events={switcherEvents}
      archivedEvents={archivedEvents}
      primaryEventId={primaryEvent?.event.id}
      pendingProposals={pendingProposals}
    >
      {children}
    </AppShell>
  );
}
