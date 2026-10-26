"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { MasterHeroEventCard } from "./MasterHeroEventCard";
import { SecondaryEventCard } from "./SecondaryEventCard";
import { MilestonesTimeline } from "./MilestonesTimeline";
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

  const primaryEvent = filteredEvents[0] || events[0];

  return (
    <div className="flex flex-col w-full">
      {/* Subtle Ambient Glow */}
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
              Curate your portfolio of weddings and milestone gatherings across
              Lagos, Ikoyi, and the diaspora.
            </p>
          </div>

          {/* Action Controls & Filters */}
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

        {/* Filter Pills Strip */}
        <div className="flex items-center justify-between flex-wrap gap-space-md mb-space-lg pb-space-sm">
          <div className="flex items-center gap-space-xs">
            <button
              type="button"
              onClick={() => setFilter("active")}
              className={`px-space-md py-1.5 rounded-full font-label-sm text-label-sm shadow-sm flex items-center gap-1.5 transition-all min-h-[36px] ${
                filter === "active"
                  ? "bg-primary text-on-primary font-bold"
                  : "bg-paper hover:bg-surface-container-high text-paper-ink"
              }`}
            >
              <span>Active</span>
              <span className="px-1.5 py-0.2 rounded-full bg-gold text-night font-bold text-[10px]">
                {activeCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("draft")}
              className={`px-space-md py-1.5 rounded-full font-label-sm text-label-sm shadow-sm flex items-center gap-1.5 transition-all min-h-[36px] ${
                filter === "draft"
                  ? "bg-primary text-on-primary font-bold"
                  : "bg-paper hover:bg-surface-container-high text-paper-ink"
              }`}
            >
              <span>Drafts</span>
              <span className="px-1.5 py-0.2 rounded-full bg-mist/30 text-paper-ink text-[10px]">
                {draftCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("past")}
              className={`px-space-md py-1.5 rounded-full font-label-sm text-label-sm shadow-sm flex items-center gap-1.5 transition-all min-h-[36px] ${
                filter === "past"
                  ? "bg-primary text-on-primary font-bold"
                  : "bg-paper hover:bg-surface-container-high text-paper-ink"
              }`}
            >
              <span>Past Gatherings</span>
              <span className="px-1.5 py-0.2 rounded-full bg-mist/30 text-paper-ink text-[10px]">
                {pastCount}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
            <Icon name="auto_awesome" className="text-base text-gold" />
            <span>Organized by celebration date</span>
          </div>
        </div>

        {/* Master Hero Event Card */}
        {primaryEvent && <MasterHeroEventCard item={primaryEvent} />}

        {/* Companion Cards: Secondary Celebrations Mosaic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg mb-space-xl">
          <SecondaryEventCard
            id="sec-1"
            title="Otunba Segun Davies 60th Jubilee"
            category="Milestone Banquet"
            dateStr="30 January 2027"
            venueStr="Grand Ballroom, Eko Hotels & Suites, VI"
            daysAway={96}
            totalInvited={250}
            confirmed={142}
            rsvpRate={56.8}
            description="High-society royal banquet celebrating six decades of service. Gold & Midnight Blue ceremonial attire strictly observed for all high dignitaries."
            statusBadge="In planning"
            iconName="workspace_premium"
          />

          <SecondaryEventCard
            id="sec-2"
            title="Adeyemi & Balogun Introduction"
            category="Family Introduction"
            dateStr="20 February 2027"
            venueStr="Private Estate Grounds, Alexander Ave, Ikoyi"
            daysAway={117}
            totalInvited={100}
            confirmed={68}
            rsvpRate={68.0}
            description="Traditional Yoruba introduction ceremony gathering elder council, bridal negotiations, and private ancestral blessings in lush garden layout."
            statusBadge="Aṣọ-Ẹbí tracking active"
            iconName="favorite"
          />
        </div>

        {/* Milestones Timeline */}
        <MilestonesTimeline milestones={milestones} />

        {/* Bottom Curatorial Note */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm text-center sm:text-left text-mist font-label-sm text-label-sm pb-space-lg border-t border-surface-container-high pt-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold inline-block" />
            <span>Àríyá • Celebration Workspace</span>
          </div>
          <div>
            <span>Synchronized with Lagos Ceremonial Servers</span>
          </div>
        </div>
      </div>
    </div>
  );
}
