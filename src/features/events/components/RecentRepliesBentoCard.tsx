"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatRelativeTimeWAT } from "@/lib/format";
import type { RecentReplyItem } from "../data/get-coming-up";

interface RecentRepliesBentoCardProps {
  recentReplies: RecentReplyItem[];
}

export function RecentRepliesBentoCard({
  recentReplies,
}: RecentRepliesBentoCardProps) {
  return (
    <section
      aria-labelledby="recent-replies-heading"
      data-testid="recent-replies-card"
      className="bento-card @container flex flex-col justify-between p-5 sm:p-6 lg:col-span-4"
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2
          id="recent-replies-heading"
          className="font-display text-xl font-bold text-night"
        >
          Recent replies
        </h2>
        <Icon name="mark_email_read" size={18} className="text-label-2" />
      </div>

      {recentReplies.length === 0 ? (
        <div
          data-testid="recent-replies-empty"
          className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-ivory/60 px-4 py-8 text-center"
        >
          <p className="text-xs sm:text-sm text-label-2 max-w-[240px]">
            No replies yet. Share invitations to start hearing back.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-hairline -my-1 flex-1">
          {recentReplies.map((reply) => {
            const isAccepted = reply.status === "accepted";
            const statusText = isAccepted
              ? `Accepted (party of ${reply.partySize})`
              : "Declined";

            return (
              <li key={reply.id} className="py-1.5">
                <Link
                  href={`/events/${reply.eventId}/guests`}
                  className="flex items-center justify-between gap-3 rounded-2xl px-2 py-1.5 hover:bg-ivory/75 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          isAccepted ? "bg-rsvp-accepted" : "bg-rsvp-declined"
                        }`}
                      />
                      <p className="text-xs sm:text-sm font-semibold text-night truncate">
                        {reply.guestName}
                      </p>
                    </div>
                    <p className="pl-4 text-[11px] text-label-2 truncate tabular-nums">
                      <span
                        className={
                          isAccepted
                            ? "font-medium text-rsvp-accepted"
                            : "font-medium text-rsvp-declined"
                        }
                      >
                        {statusText}
                      </span>{" "}
                      · {reply.eventTitle}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-label-2 tabular-nums">
                    {formatRelativeTimeWAT(reply.updatedAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
