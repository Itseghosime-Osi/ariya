"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { getPartyDisplaySeats } from "@/lib/metrics";
import type { RecentGuestResponse } from "../../types";

interface RecentResponsesFeedProps {
  eventId: string;
  totalAttendees: number;
  recentResponses: RecentGuestResponse[];
}

export function RecentResponsesFeed({
  eventId,
  totalAttendees,
  recentResponses,
}: RecentResponsesFeedProps) {
  return (
    <div className="bg-surface-container-lowest rounded-[24px] p-margin shadow-[0_2px_8px_-2px_rgba(28,7,13,0.05),0_1px_3px_0_rgba(28,7,13,0.04)] space-y-space-md border border-surface-container-high/40">
      <div className="flex items-center justify-between">
        <h3 className="font-headline-sm text-headline-sm text-night">
          Recent Responses
        </h3>
        <Link
          className="font-label-sm text-primary font-semibold hover:underline"
          href={`/events/${eventId}/guests`}
        >
          View Guestbook ({totalAttendees})
        </Link>
      </div>

      <div className="space-y-space-xs">
        {recentResponses.length === 0 ? (
          <div className="py-8 text-center text-on-surface-variant font-body-sm">
            No guest responses recorded yet. Responses will appear here as
            guests confirm.
          </div>
        ) : (
          recentResponses.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-title-md font-bold">
                  {item.initials}
                </div>
                <div>
                  <div className="font-title-md text-on-surface flex items-center gap-2">
                    <span>{item.guestName}</span>
                    {item.groupName && (
                      <span className="px-2 py-0.5 rounded-full bg-primary text-ivory font-label-sm text-[10px]">
                        {item.groupName}
                      </span>
                    )}
                  </div>
                  <span className="font-body-sm text-on-surface-variant text-[12px]">
                    {item.side} · Party of{" "}
                    {getPartyDisplaySeats({
                      party_size: item.partySize,
                      rsvp: {
                        status: item.status,
                        attending_count: item.attendingCount,
                      },
                    })}
                    {item.status === "accepted"
                      ? item.tableName
                        ? ` · ${item.tableName}`
                        : " · Unassigned"
                      : ""}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-space-sm">
                <span
                  className={`px-3 py-1 rounded-full font-label-sm font-semibold flex items-center gap-1 ${
                    item.status === "accepted"
                      ? "bg-success-surface text-success"
                      : item.status === "declined"
                        ? "bg-surface-container-high text-on-surface-variant"
                        : "bg-secondary-container text-on-secondary-container"
                  }`}
                >
                  <Icon
                    name={
                      item.status === "accepted"
                        ? "check"
                        : item.status === "declined"
                          ? "close"
                          : "schedule"
                    }
                    className="text-sm"
                  />
                  <span>
                    {item.status === "accepted"
                      ? "Confirmed"
                      : item.status === "declined"
                        ? "Declined"
                        : "Awaiting"}
                  </span>
                </span>
                <span className="font-body-sm text-on-surface-variant text-[11px]">
                  {item.timeAgo}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
