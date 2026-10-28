"use client";

import React, { useMemo, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { LazyMotion, m } from "motion/react";
import { domAnimation } from "./motion-features";
import type { EventWithMetrics } from "../types";
import type { ComingUpItem } from "../lib/coming-up";
import type { NeedsAttentionAlert } from "../lib/needs-attention";
import { partitionEvents, pickHeroEvent } from "../lib/select-events";
import { filterEvents, SEARCH_THRESHOLD } from "../lib/filter-events";
import { EventsHeader } from "./EventsHeader";
import { EventsSearch } from "./EventsSearch";
import { NeedsAttentionStrip } from "./NeedsAttentionStrip";
import { HeroEventCard } from "./HeroEventCard";
import { EventCard } from "./EventCard";
import { ComingUpList } from "./ComingUpList";
import { EventsEmptyState } from "./EventsEmptyState";
import { EventsNoResults } from "./EventsNoResults";

export interface EventsHomeProps {
  events: EventWithMetrics[];
  comingUpItems?: ComingUpItem[];
  needsAttentionItems?: NeedsAttentionAlert[];
  firstName?: string | null;
}

const TAB_CLS =
  "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold tabular-nums transition-colors data-[state=active]:bg-burgundy data-[state=active]:text-ivory data-[state=inactive]:text-label-2 hover:text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

export function EventsHome({
  events,
  comingUpItems = [],
  needsAttentionItems = [],
  firstName,
}: EventsHomeProps) {
  const { upcoming, past } = useMemo(() => partitionEvents(events), [events]);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">(
    upcoming.length === 0 && past.length > 0 ? "past" : "upcoming"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const showSearch = events.length > SEARCH_THRESHOLD;
  const hasQuery = searchQuery.trim().length > 0;
  const filteredUpcoming = useMemo(
    () => filterEvents(upcoming, searchQuery),
    [upcoming, searchQuery]
  );
  const filteredPast = useMemo(
    () => filterEvents(past, searchQuery),
    [past, searchQuery]
  );
  const hero = useMemo(
    () => pickHeroEvent(filteredUpcoming),
    [filteredUpcoming]
  );
  const restUpcoming = useMemo(
    () =>
      hero
        ? filteredUpcoming.filter((e) => e.event.id !== hero.event.id)
        : filteredUpcoming,
    [filteredUpcoming, hero]
  );

  if (events.length === 0) {
    return (
      <div className="space-y-6 pb-8">
        <EventsHeader firstName={firstName} />
        <EventsEmptyState />
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="space-y-6 sm:space-y-8 pb-8">
        <EventsHeader firstName={firstName} />
        <NeedsAttentionStrip items={needsAttentionItems} />

        <Tabs.Root
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "upcoming" | "past")}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
            <Tabs.List
              aria-label="Event status tabs"
              className="inline-flex items-center gap-1.5 rounded-xl bg-surface p-1 border border-hairline self-start"
            >
              <Tabs.Trigger
                value="upcoming"
                data-testid="tab-upcoming"
                className={TAB_CLS}
              >
                Upcoming ({upcoming.length})
              </Tabs.Trigger>
              <Tabs.Trigger
                value="past"
                data-testid="tab-past"
                className={TAB_CLS}
              >
                Past ({past.length})
              </Tabs.Trigger>
            </Tabs.List>
            {showSearch && (
              <EventsSearch
                query={searchQuery}
                onQueryChange={setSearchQuery}
              />
            )}
          </div>

          <Tabs.Content
            value="upcoming"
            className="space-y-6 focus:outline-none"
          >
            {filteredUpcoming.length === 0 && hasQuery ? (
              <EventsNoResults
                query={searchQuery}
                onClear={() => setSearchQuery("")}
              />
            ) : (
              <m.div
                initial={{ y: 4 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                {hero ? (
                  <HeroEventCard item={hero} />
                ) : (
                  <div className="rounded-2xl bg-surface border border-hairline p-8 text-center">
                    <p className="font-display text-lg font-semibold text-night">
                      No upcoming events
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {restUpcoming.length > 0 && (
                    <section
                      aria-labelledby="more-upcoming-heading"
                      className="lg:col-span-7 space-y-3"
                    >
                      <h2
                        id="more-upcoming-heading"
                        className="text-xs font-semibold uppercase tracking-[0.06em] text-label-2"
                      >
                        More upcoming events
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {restUpcoming.map((item) => (
                          <EventCard key={item.event.id} item={item} />
                        ))}
                      </div>
                    </section>
                  )}
                  <div
                    className={
                      restUpcoming.length > 0
                        ? "lg:col-span-5"
                        : "lg:col-span-12"
                    }
                  >
                    <ComingUpList items={comingUpItems} />
                  </div>
                </div>
              </m.div>
            )}
          </Tabs.Content>

          <Tabs.Content value="past" className="space-y-4 focus:outline-none">
            {filteredPast.length === 0 ? (
              hasQuery ? (
                <EventsNoResults
                  query={searchQuery}
                  onClear={() => setSearchQuery("")}
                />
              ) : (
                <div className="rounded-2xl bg-surface border border-hairline p-8 text-center">
                  <p className="font-display text-lg font-semibold text-night">
                    No past events yet
                  </p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPast.map((item) => (
                  <EventCard key={item.event.id} item={item} />
                ))}
              </div>
            )}
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </LazyMotion>
  );
}

export { EventsHome as CelebrationsList };
