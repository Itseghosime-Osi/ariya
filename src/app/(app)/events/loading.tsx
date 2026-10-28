import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { EventsSkeleton } from "@/features/events/components/EventsSkeleton";

export default function EventsLoading() {
  return (
    <AppShell showFloatingNewEvent>
      <EventsSkeleton />
    </AppShell>
  );
}
