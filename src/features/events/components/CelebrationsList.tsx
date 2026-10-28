"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { MasterHeroEventCard } from "./MasterHeroEventCard";
import { SecondaryEventCard } from "./SecondaryEventCard";
import { MilestonesTimeline } from "./MilestonesTimeline";
import { CelebrationFilterPills } from "./CelebrationFilterPills";
import type { EventWithMetrics, MilestoneItem } from "../types";

interface CelebrationsListProps {
  events: EventWithMetrics[];
  milestones: MilestoneItem[];
}

export function CelebrationsList({
  events,
  milestones,
}: CelebrationsListProps) {
  const [filter, setFilter] = useState<"active" | "draft" | "past">("active");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = events.filter((item) => {
    const matchesSearch =
      item.event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.event.couple.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.event.venue.toLowerCase().includes(searchQuery.toLowerCase());

    if (filter === "active")
      return matchesSearch && item.event.status === "active";
    if (filter === "draft")
      return matchesSearch && item.event.status === "draft";
    if (filter === "past")
      return matchesSearch && item.event.status === "archived";
    return matchesSearch;
  });

  const activeCount = events.filter((e) => e.event.status === "active").length;
  const draftCount = events.filter((e) => e.event.status === "draft").length;
  const pastCount = events.filter((e) => e.event.status === "archived").length;

  const primaryEvent = filteredEvents[0];
  const secondaryEvents = filteredEvents.slice(1);

  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full overflow-hidden">
        <div className="absolute -top-32 right-12 w-96 h-96 rounded-full bg-secondary-fixed/20 blur-3xl pointer-events-none" />
        <div className="absolute top-96 -left-20 w-80 h-80 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />

        {/* Editorial Header Section */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg mb-space-xl">
          <div className="space-y-space-xs max-w-2xl">
            <div className="flex items-center gap-space-xs text-secondary">
              <span className="font-label-sm uppercase tracking-widest font-bold">
                Portfolio
              </span>
              <span className="text-mist">•</span>
              <span className="font-label-sm font-semibold">
                Your celebrations
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">
              Your Celebrations
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Manage your weddings and milestone celebrations from invitation to
              reception.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="relative flex-grow sm:flex-grow-0">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-outline pointer-events-none"
                aria-hidden="true"
              />
              <input
                className="pl-9 pr-4 py-2.5 rounded-xl bg-paper text-paper-ink font-body-sm text-body-sm shadow-inner placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-gold transition-all w-full sm:w-56"
                placeholder="Search celebration..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Link
              href="/events/new"
              className="flex items-center gap-space-xs px-space-md py-2.5 rounded-xl bg-gold text-night font-label-md text-label-md font-semibold shadow-md hover:bg-secondary-fixed hover:shadow-lg transition-all group min-h-[44px]"
            >
              <Icon
                name="add"
                className="text-lg transition-transform group-hover:rotate-90"
              />
              <span>New Celebration</span>
            </Link>
          </div>
        </header>

        <CelebrationFilterPills
          filter={filter}
          setFilter={setFilter}
          activeCount={activeCount}
          draftCount={draftCount}
          pastCount={pastCount}
        />

        {/* Empty State */}
        {events.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-surface-container-high/60 my-6 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Icon name="celebration" className="text-3xl text-wine" />
            </div>
            <h3 className="font-headline-md text-headline-md text-night mb-2">
              No celebrations yet
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto mb-6">
              Create your first wedding or celebration to begin managing guests,
              RSVPs, and seating arrangements.
            </p>
            <Link
              href="/events/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-wine hover:bg-night text-ivory font-label-md font-semibold shadow-md transition-all min-h-[44px]"
            >
              <Icon name="add" className="text-lg text-gold" />
              <span>Create Your First Celebration</span>
            </Link>
          </div>
        ) : !primaryEvent ? (
          <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-surface-container-high/60 my-6">
            <p className="font-body-md text-on-surface-variant">
              No celebrations found matching &ldquo;{searchQuery}&rdquo;.
            </p>
          </div>
        ) : (
          <>
            <MasterHeroEventCard item={primaryEvent} />

            {secondaryEvents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg mb-space-xl">
                {secondaryEvents.map((sec) => (
                  <SecondaryEventCard
                    key={sec.event.id}
                    id={sec.event.id}
                    title={sec.event.title}
                    category={sec.event.area || "Celebration"}
                    dateStr={sec.event.date}
                    venueStr={sec.event.venue}
                    daysAway={sec.metrics.daysAway}
                    totalInvited={sec.metrics.totalParties}
                    confirmed={sec.metrics.acceptedGuests}
                    rsvpRate={
                      sec.metrics.rsvpRate ?? sec.metrics.readinessPercentage
                    }
                    description={sec.event.dress_code || "Formal attire"}
                    statusBadge={sec.event.status}
                    iconName="workspace_premium"
                  />
                ))}
              </div>
            )}

            {milestones.length > 0 && (
              <MilestonesTimeline milestones={milestones} />
            )}
          </>
        )}

        {/* Bottom Curatorial Note */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm text-center sm:text-left text-on-surface-variant font-label-sm text-label-sm pb-space-lg border-t border-surface-container-high pt-4 mt-8">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold inline-block" />
            <span>Àríyá • Celebration Workspace</span>
          </div>
        </div>
      </div>
    </div>
  );
}
