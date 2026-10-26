import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CelebrationsList } from "@/features/events/components/CelebrationsList";
import { getUserEvents, getEventMilestones } from "@/features/events/queries";
import { getCurrentUser } from "@/features/auth/queries";

export const metadata = {
  title: "Your Celebrations • Àríyá",
  description: "Curate your portfolio of weddings and milestone gatherings",
};

export default async function EventsPage() {
  const [events, user] = await Promise.all([getUserEvents(), getCurrentUser()]);

  const primaryEvent = events[0];
  const milestones = await getEventMilestones(
    primaryEvent?.event.id || "default"
  );

  return (
    <AppShell
      eventId={primaryEvent?.event.id}
      eventTitle={primaryEvent?.event.title}
      eventDate={primaryEvent?.event.date}
      daysAway={primaryEvent?.metrics.daysAway}
      userEmail={user?.email}
    >
      <CelebrationsList events={events} milestones={milestones} />
    </AppShell>
  );
}
