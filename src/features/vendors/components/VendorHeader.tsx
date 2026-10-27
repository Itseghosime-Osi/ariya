"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatKobo } from "@/lib/format";
import type { VendorFinancialStats } from "../types";

interface VendorHeaderProps {
  eventId: string;
  stats: VendorFinancialStats;
  onAddVendor: () => void;
}

export function VendorHeader({
  eventId,
  stats,
  onAddVendor,
}: VendorHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-wine/70 mb-1">
            <Link
              href={`/events/${eventId}`}
              className="hover:underline flex items-center gap-1 font-medium"
            >
              <Icon name="arrow_back" className="text-xs" />
              <span>Event Overview</span>
            </Link>
            <span>•</span>
            <span className="text-wine font-semibold">Vendor Suite</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-wine">
            Vendor Management &amp; Contracts
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Orchestrate ceremonial artisans, track contracts in integer kobo,
            and monitor deliverables.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddVendor}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-wine text-ivory text-xs font-semibold shadow-xs hover:bg-wine/90 transition-colors shrink-0"
        >
          <Icon name="add" className="text-sm text-gold" />
          <span>Add Vendor</span>
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-wine/70 block">
            Total Contracted
          </span>
          <p className="font-serif text-xl sm:text-2xl font-bold text-wine">
            {formatKobo(stats.contractedKobo)}
          </p>
          <span className="text-[11px] text-on-surface-variant block">
            Across all suppliers
          </span>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-wine/70 block">
            Deposits Disbursed
          </span>
          <p className="font-serif text-xl sm:text-2xl font-bold text-emerald-800">
            {formatKobo(stats.depositsPaidKobo)}
          </p>
          <span className="text-[11px] text-emerald-700 block">
            Paid &amp; verified
          </span>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-wine/70 block">
            Balance Due
          </span>
          <p className="font-serif text-xl sm:text-2xl font-bold text-amber-900">
            {formatKobo(stats.balanceDueKobo)}
          </p>
          <span className="text-[11px] text-on-surface-variant block">
            Outstanding liability
          </span>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-wine/70 block">
            Task Deliverables
          </span>
          <div className="flex items-baseline gap-2">
            <p className="font-serif text-xl sm:text-2xl font-bold text-wine">
              {stats.completedTasksCount}
              <span className="text-sm font-normal text-on-surface-variant">
                /{stats.totalTasksCount}
              </span>
            </p>
            {stats.overdueTasksCount > 0 && (
              <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                {stats.overdueTasksCount} overdue
              </span>
            )}
          </div>
          <span className="text-[11px] text-on-surface-variant block">
            {stats.totalTasksCount === 0
              ? "No tasks assigned"
              : `${Math.round((stats.completedTasksCount / (stats.totalTasksCount || 1)) * 100)}% completed`}
          </span>
        </div>
      </div>
    </div>
  );
}
