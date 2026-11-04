"use client";

import React from "react";
import Link from "next/link";
import { m } from "motion/react";
import { Icon } from "@/components/ui/icon";
import { MonogramSeal } from "./MonogramSeal";

export interface GuestbookEntry {
  id: string;
  name: string;
  status: "accepted" | "declined" | "pending";
  partySize: number;
  /** "Bride's side · Table 4" or the celebration's name. */
  meta?: string | null;
  when?: string | null;
  href?: string;
}

/**
 * Replies as notes in a guestbook: each guest's wax-seal monogram, their answer as a ribbon, and how
 * many are coming. The newest note sits on top and arrives with a small flourish.
 */
export function Guestbook({
  entries,
  empty,
  limit = 6,
}: {
  entries: GuestbookEntry[];
  empty: React.ReactNode;
  limit?: number;
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-hairline px-6 py-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-tint-sand text-gold-ink">
          <Icon name="mail" size={20} />
        </span>
        <div className="max-w-xs text-sm text-label-2">{empty}</div>
      </div>
    );
  }
  return (
    <ol className="relative space-y-2.5">
      {entries.slice(0, limit).map((e, i) => {
        const coming = e.status === "accepted";
        const body = (
          <div className="flex items-center gap-3">
            <MonogramSeal
              text={e.name}
              size={42}
              className="shrink-0 drop-shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold text-night">
                  {e.name}
                </span>
                {coming && e.partySize > 1 && (
                  <span className="shrink-0 rounded-full bg-tint-sand px-1.5 py-0.5 text-[10px] font-bold text-gold-ink">
                    +{e.partySize - 1}
                  </span>
                )}
              </div>
              {e.meta && (
                <div className="truncate text-xs text-label-2">{e.meta}</div>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  coming
                    ? "bg-[#1c070d] text-[#e9c98a]"
                    : e.status === "declined"
                      ? "bg-surface-container text-label-2"
                      : "bg-tint-sand text-gold-ink"
                }`}
              >
                <Icon
                  name={
                    coming
                      ? "check"
                      : e.status === "declined"
                        ? "close"
                        : "schedule"
                  }
                  size={12}
                />
                {coming
                  ? "Coming"
                  : e.status === "declined"
                    ? "Can't make it"
                    : "Yet to reply"}
              </span>
              {e.when && (
                <span className="text-[10px] text-label-2">{e.when}</span>
              )}
            </div>
          </div>
        );
        return (
          <m.li
            key={e.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.05 * i,
              type: "spring",
              visualDuration: 0.4,
              bounce: 0.15,
            }}
          >
            {e.href ? (
              <Link
                href={e.href}
                className="block rounded-2xl bg-ivory p-3 ring-1 ring-hairline transition-shadow hover:shadow-[0_10px_24px_-14px_rgba(28,7,13,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                {body}
              </Link>
            ) : (
              <div className="rounded-2xl bg-ivory p-3 ring-1 ring-hairline">
                {body}
              </div>
            )}
          </m.li>
        );
      })}
    </ol>
  );
}
