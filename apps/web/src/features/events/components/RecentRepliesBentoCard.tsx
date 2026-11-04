"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
import { formatRelativeTimeWAT } from "@/lib/format";
import type { RecentReplyItem } from "../data/get-coming-up";
import { Guestbook } from "./desk/Guestbook";

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
      className="bento-card @container flex flex-col p-5 sm:p-6 lg:col-span-4"
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-ink">
            Guestbook
          </div>
          <h2
            id="recent-replies-heading"
            className="font-display text-xl font-bold text-night"
          >
            Recent replies
          </h2>
        </div>
      </div>

      {recentReplies.length === 0 ? (
        <div
          data-testid="recent-replies-empty"
          className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-hairline px-4 py-8 text-center"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-tint-sand text-gold-ink">
            <Icon name="mail" size={20} />
          </span>
          <p className="max-w-[240px] text-sm text-label-2">
            No replies yet. Share invitations and the first notes will land
            here.
          </p>
        </div>
      ) : (
        <Guestbook
          limit={4}
          empty={null}
          entries={recentReplies.map((reply) => ({
            id: reply.id,
            name: reply.guestName,
            status: reply.status,
            partySize: reply.partySize,
            meta: reply.eventTitle,
            when: formatRelativeTimeWAT(reply.updatedAt),
            href: `/events/${reply.eventId}/guests`,
          }))}
        />
      )}
    </section>
  );
}
