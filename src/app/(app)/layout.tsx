import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import type { SwitcherEvent } from "@/components/layout/nav-items";
import { getCurrentUser } from "@/features/auth/queries";
import { getUserEvents } from "@/features/events/queries";
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
  const [user, events] = await Promise.all([getCurrentUser(), getUserEvents()]);

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

  return (
    <AppShell
      userEmail={user?.email}
      events={switcherEvents}
      primaryEventId={primaryEvent?.event.id}
    >
      {children}
    </AppShell>
  );
}
