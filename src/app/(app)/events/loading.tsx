import React from "react";
import { EventsSkeleton } from "@/features/events/components/EventsSkeleton";

export default function EventsLoading() {
  return (
    <div className="min-h-screen bg-ivory text-night md:pl-[88px] lg:pl-[228px] pt-20 pb-28 md:pb-12">
      <div className="px-4 sm:px-6 lg:px-8 max-w-[1280px] w-full mx-auto">
        <EventsSkeleton />
      </div>
    </div>
  );
}
