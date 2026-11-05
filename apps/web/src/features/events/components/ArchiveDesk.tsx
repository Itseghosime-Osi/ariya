"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { MonogramSeal } from "@/features/events/components/desk/MonogramSeal";
import { restoreEventAction } from "@/features/events/settings-actions";
import { formatEventDate } from "@/lib/format";
import { DeleteEventDialog } from "./DeleteEventDialog";

export interface ArchivedItem {
  id: string;
  title: string;
  couple: string;
  date: string;
  /** The celebration's day has passed. */
  ended: boolean;
  canDelete: boolean;
  guests: number;
}

const CHIP =
  "inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

/** The archive: every celebration you have filed away, with the two things you can do to it. */
export function ArchiveDesk({ items }: { items: ArchivedItem[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ArchivedItem | null>(null);

  const restore = (item: ArchivedItem) => {
    setError(null);
    setBusyId(item.id);
    startTransition(async () => {
      const res = await restoreEventAction(item.id);
      setBusyId(null);
      if (!res.ok) {
        setError(res.error ?? "Could not restore this celebration.");
        return;
      }
      router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <section className="flex flex-col items-center rounded-3xl border border-hairline bg-white/40 px-6 py-12 text-center backdrop-blur-sm">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-tint-sand text-gold-ink">
          <Icon name="folder" size={24} />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold text-night">
          Nothing in the archive
        </h2>
        <p className="mt-1 max-w-sm text-sm text-label-2">
          When you archive a celebration it leaves your celebrations and waits
          here, so your home stays about what is coming up.
        </p>
      </section>
    );
  }

  return (
    <>
      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-error-container px-4 py-3 text-sm font-semibold text-error"
        >
          {error}
        </p>
      )}
      <ul
        aria-label="Archived celebrations"
        className="divide-y divide-hairline overflow-hidden rounded-3xl border border-hairline bg-white/40 backdrop-blur-sm"
      >
        {items.map((item) => (
          <li key={item.id} className="px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3.5">
              <MonogramSeal
                text={item.couple || item.title}
                size={44}
                className="shrink-0"
              />
              <Link
                href={`/events/${item.id}`}
                className="group min-w-0 flex-1 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                <span className="block truncate text-[15px] font-semibold text-night group-hover:text-burgundy">
                  {item.title}
                </span>
                <span className="block truncate text-[12.5px] text-label-2">
                  {formatEventDate(item.date)} · {item.guests}{" "}
                  {item.guests === 1 ? "guest" : "guests"}
                </span>
              </Link>
              <span
                className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] sm:inline ${
                  item.ended
                    ? "bg-[#1c070d] text-[#e9c98a]"
                    : "bg-tint-sand text-gold-ink"
                }`}
              >
                {item.ended ? "Ended" : "Archived"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => restore(item)}
                disabled={busyId === item.id}
                className={`${CHIP} desk-chip text-night disabled:opacity-50`}
              >
                <Icon name="refresh" size={14} />
                {busyId === item.id ? "Restoring…" : "Restore"}
              </button>
              {item.canDelete && (
                <button
                  type="button"
                  onClick={() => setToDelete(item)}
                  className={`${CHIP} text-error hover:bg-error-container`}
                >
                  <Icon name="delete" size={14} />
                  Delete forever
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {toDelete && (
        <DeleteEventDialog
          event={toDelete}
          open
          onOpenChange={(open) => {
            if (!open) setToDelete(null);
          }}
          onDeleted={() => {
            setToDelete(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
