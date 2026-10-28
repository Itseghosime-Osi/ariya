"use client";

import React, { useMemo, useState } from "react";
import { LazyMotion, MotionConfig } from "motion/react";
import { partitionEvents } from "../lib/select-events";
import { filterEvents, SEARCH_THRESHOLD } from "../lib/filter-events";
import type { ComingUpItem } from "../lib/coming-up";
import type { NeedsAttentionAlert } from "../lib/needs-attention";
import type { RecentReplyItem } from "../data/get-coming-up";
import type { EventWithMetrics } from "../types";
import { domAnimation } from "./motion-features";
import { EventsHeader } from "./EventsHeader";
import { EventsEmptyState } from "./EventsEmptyState";
import { UpcomingEventsBentoCard } from "./UpcomingEventsBentoCard";
import { TodoBentoCard } from "./TodoBentoCard";
import { GuestRepliesBentoCard } from "./GuestRepliesBentoCard";
import { RecentRepliesBentoCard } from "./RecentRepliesBentoCard";
import { ThisWeekBentoCard } from "./ThisWeekBentoCard";
import { AllEventsBentoCard } from "./AllEventsBentoCard";

export interface EventsHomeProps {
  events: EventWithMetrics[];
  comingUpItems?: ComingUpItem[];
  needsAttentionItems?: NeedsAttentionAlert[];
  recentReplies?: RecentReplyItem[];
  firstName?: string | null;
}

export function EventsHome({
  events,
  comingUpItems = [],
  needsAttentionItems = [],
  recentReplies = [],
  firstName,
}: EventsHomeProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { upcoming, past } = useMemo(() => partitionEvents(events), [events]);
  const showSearch = events.length > SEARCH_THRESHOLD;

  const filteredUpcoming = useMemo(
    () => (showSearch ? filterEvents(upcoming, searchQuery) : upcoming),
    [upcoming, searchQuery, showSearch]
  );

  const filteredPast = useMemo(
    () => (showSearch ? filterEvents(past, searchQuery) : past),
    [past, searchQuery, showSearch]
  );

  const handleSeeAll = () => {
    const el = document.getElementById("all-events-card");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  if (events.length === 0) {
    return (
      <LazyMotion features={domAnimation}>
        <MotionConfig reducedMotion="user">
          <div className="space-y-6 pb-8">
            <EventsHeader firstName={firstName} />
            <EventsEmptyState />
          </div>
        </MotionConfig>
      </LazyMotion>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div className="space-y-6 pb-8" data-testid="bento-dashboard">
          <EventsHeader
            firstName={firstName}
            showSearch={showSearch}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <UpcomingEventsBentoCard
              upcomingEvents={filteredUpcoming}
              totalEventsCount={events.length}
              onSeeAll={handleSeeAll}
            />

            <TodoBentoCard alerts={needsAttentionItems} />

            <GuestRepliesBentoCard upcomingEvents={upcoming} />

            <RecentRepliesBentoCard recentReplies={recentReplies} />

            <ThisWeekBentoCard items={comingUpItems} />

            {events.length >= 2 && (
              <AllEventsBentoCard
                upcoming={filteredUpcoming}
                past={filteredPast}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery("")}
              />
            )}
          </div>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}

export { EventsHome as CelebrationsList };
