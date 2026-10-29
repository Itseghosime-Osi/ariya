"use client";

import React, { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { getShareTarget } from "../lib/share";
import type { EventWithMetrics } from "../types";
import { EventsNoResults } from "./EventsNoResults";
import { AllEventsRow } from "./AllEventsRow";

interface AllEventsBentoCardProps {
  upcoming: EventWithMetrics[];
  past: EventWithMetrics[];
  searchQuery?: string;
  onClearSearch?: () => void;
}

export function AllEventsBentoCard({
  upcoming,
  past,
  searchQuery = "",
  onClearSearch,
}: AllEventsBentoCardProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sort, setSort] = useState<"soonest" | "replied" | "name">("soonest");

  const sorted = (list: EventWithMetrics[], isPastTab: boolean) => {
    if (sort === "replied")
      return [...list].sort((a, b) => b.metrics.rsvpRate - a.metrics.rsvpRate);
    if (sort === "name")
      return [...list].sort((a, b) =>
        a.event.title.localeCompare(b.event.title)
      );
    // Soonest: the list arrives in date order already (nearest upcoming, most recent past).
    void isPastTab;
    return list;
  };

  const handleCopyShare = async (event: EventWithMetrics["event"]) => {
    const target = getShareTarget(
      event,
      typeof window !== "undefined" ? window.location.origin : ""
    );
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target.url);
      setCopiedId(event.id);
      window.setTimeout(() => {
        setCopiedId((curr) => (curr === event.id ? null : curr));
      }, 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const renderRows = (list: EventWithMetrics[], isPastTab: boolean) => {
    if (list.length === 0) {
      if (searchQuery.trim() && onClearSearch) {
        return <EventsNoResults query={searchQuery} onClear={onClearSearch} />;
      }
      return (
        <div
          data-testid={isPastTab ? "empty-past-tab" : "empty-upcoming-tab"}
          className="rounded-2xl border border-dashed border-hairline bg-ivory/40 px-6 py-8 text-center"
        >
          <p className="font-display text-lg font-semibold text-night">
            {isPastTab ? "No past celebrations" : "No upcoming celebrations"}
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-hairline text-[10px] font-bold uppercase tracking-[0.16em] text-label-2">
              <th scope="col" className="py-2 pr-4">
                Event
              </th>
              <th scope="col" className="py-2 px-3">
                Date
              </th>
              <th scope="col" className="py-2 px-3">
                Days left
              </th>
              <th scope="col" className="py-2 px-3">
                Replied
              </th>
              <th scope="col" className="py-2 px-3">
                Seated
              </th>
              <th scope="col" className="py-2 px-3">
                Plan
              </th>
              <th scope="col" className="py-2 px-3">
                Share
              </th>
              <th scope="col" className="py-2 pl-3 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline text-xs">
            {sorted(list, isPastTab).map((item) => (
              <AllEventsRow
                key={item.event.id}
                item={item}
                isPastTab={isPastTab}
                copiedId={copiedId}
                onCopyShare={(ev) => void handleCopyShare(ev)}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section
      id="all-events-card"
      aria-labelledby="all-events-heading"
      data-testid="all-events-card"
      className="bento-card p-5 sm:p-6 lg:col-span-12"
    >
      <Tabs.Root
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "upcoming" | "past")}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-ink">
              The ledger
            </div>
            <h2
              id="all-events-heading"
              className="font-display text-xl font-bold text-night"
            >
              All events
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center gap-1 rounded-full bg-surface-container p-1"
              role="group"
              aria-label="Sort events"
            >
              {(
                [
                  ["soonest", "Soonest"],
                  ["replied", "Most replied"],
                  ["name", "A–Z"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={sort === key}
                  onClick={() => setSort(key)}
                  className={`min-h-[34px] rounded-full px-3 text-xs font-semibold transition-colors ${
                    sort === key
                      ? "bg-white text-night shadow-sm"
                      : "text-label-2 hover:text-night"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Tabs.List
              aria-label="Filter celebrations by status"
              className="inline-flex items-center gap-1 rounded-full bg-surface-container p-1 self-start"
            >
              <Tabs.Trigger
                value="upcoming"
                data-testid="tab-upcoming"
                className="min-h-[34px] rounded-full px-3.5 py-1 text-xs font-semibold text-night/75 data-[state=active]:bg-burgundy data-[state=active]:text-white tabular-nums"
              >
                Upcoming ({upcoming.length})
              </Tabs.Trigger>
              <Tabs.Trigger
                value="past"
                data-testid="tab-past"
                className="min-h-[34px] rounded-full px-3.5 py-1 text-xs font-semibold text-night/75 data-[state=active]:bg-burgundy data-[state=active]:text-white tabular-nums"
              >
                Past ({past.length})
              </Tabs.Trigger>
            </Tabs.List>
          </div>
        </div>
        <Tabs.Content value="upcoming">
          {renderRows(upcoming, false)}
        </Tabs.Content>
        <Tabs.Content value="past">{renderRows(past, true)}</Tabs.Content>
      </Tabs.Root>
    </section>
  );
}
