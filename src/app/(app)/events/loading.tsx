import React from "react";
import { EventsSkeleton } from "@/features/events/components/EventsSkeleton";

// Streams into the shell's content area; the sidebar and dock stay put.
export default function EventsLoading() {
  return <EventsSkeleton />;
}
