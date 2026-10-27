"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";

interface CelebrationFilterPillsProps {
  filter: "active" | "draft" | "past";
  setFilter: (f: "active" | "draft" | "past") => void;
  activeCount: number;
  draftCount: number;
  pastCount: number;
}

export function CelebrationFilterPills({
  filter,
  setFilter,
  activeCount,
  draftCount,
  pastCount,
}: CelebrationFilterPillsProps) {
  return (
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
  );
}
