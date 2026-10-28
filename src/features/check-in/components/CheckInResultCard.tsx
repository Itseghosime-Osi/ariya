"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
import { pluralise } from "@/lib/metrics";
import type { CheckInResult } from "../types";

interface CheckInResultCardProps {
  result: CheckInResult | null;
  onDismiss: () => void;
}

export function CheckInResultCard({
  result,
  onDismiss,
}: CheckInResultCardProps) {
  if (!result) return null;

  if (result.status === "checked_in") {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Icon name="verified" className="text-xl" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 block">
                Admission Approved
              </span>
              <h3 className="font-serif text-xl font-bold text-emerald-950">
                {result.guest_name || "Honoured Guest"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-emerald-800 hover:text-emerald-950 p-1"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-white/70 p-3 rounded-xl border border-emerald-200">
          <div>
            <span className="text-[10px] text-emerald-800/80 font-bold uppercase block">
              Admitted Now
            </span>
            <span className="font-bold text-emerald-950 text-sm">
              +{pluralise(result.admitted_now ?? 0, "guest")}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-emerald-800/80 font-bold uppercase block">
              Total Checked In
            </span>
            <span className="font-bold text-emerald-950 text-sm">
              {result.total_checked_in} of {result.attending_count}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] text-emerald-800/80 font-bold uppercase block">
              Seating Assignment
            </span>
            <span className="font-bold text-emerald-950 text-sm flex items-center gap-1">
              <Icon
                name="table_restaurant"
                className="text-xs text-emerald-700"
              />
              <span>{result.table_name || "Open / Unassigned"}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === "already_checked_in") {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 shadow-xs space-y-2 relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon name="warning" className="text-amber-600 text-xl shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-800 block">
                Already Checked In
              </span>
              <h4 className="font-serif text-base font-bold text-amber-950">
                {result.guest_name}
              </h4>
            </div>
          </div>
          <button type="button" onClick={onDismiss} className="text-amber-800">
            <Icon name="close" className="text-base" />
          </button>
        </div>
        <p className="text-xs text-amber-900">
          This party has already been fully checked in (
          {result.checked_in_count} of {result.attending_count} admitted).
        </p>
      </div>
    );
  }

  // Not attending, wrong event, or unknown code
  return (
    <div className="bg-red-50 border border-red-300 rounded-2xl p-5 shadow-xs space-y-2 relative">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon name="error" className="text-red-600 text-xl shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold text-red-800 block">
              Admission Rejected
            </span>
            <h4 className="font-serif text-base font-bold text-red-950">
              {result.status === "wrong_event"
                ? "Celebration Mismatch"
                : result.status === "not_attending"
                  ? "RSVP Not Confirmed"
                  : "Unknown Code"}
            </h4>
          </div>
        </div>
        <button type="button" onClick={onDismiss} className="text-red-800">
          <Icon name="close" className="text-base" />
        </button>
      </div>
      <p className="text-xs text-red-900">
        {result.message} {result.guest_name ? `(${result.guest_name})` : ""}
      </p>
    </div>
  );
}
