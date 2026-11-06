"use client";

import { Check, Clock, Mail, Phone } from "lucide-react";
import type { RunSheetData } from "@/features/day-of/queries";

/**
 * The day itself, as a sheet you can hold in one hand (6.4.4).
 *
 * Deliberately quiet: a time, what happens, and whether it is done. Nothing here is editable on the
 * day — the checklist is where a host changes their mind, and a run sheet that could be rewritten
 * under pressure is a liability rather than a help.
 */
export function RunSheetClient({ data }: { data: RunSheetData }) {
  if (data.rows.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-sm text-label-2">
          Nothing is scheduled for the day itself yet. It fills in once the
          checklist has been generated.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-label-2">
          Run sheet
        </p>
        <h1 className="mt-1 font-display text-2xl text-night">
          {data.eventTitle}
        </h1>
        <p className="mt-1 text-sm text-label-2">
          {data.doneCount} of {data.rows.length} done
        </p>
      </header>

      <ol className="space-y-2">
        {data.rows.map((row) => (
          <li
            key={row.id}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
              row.isHardStop
                ? "border-burgundy/40 bg-white/70"
                : "border-hairline/60 bg-white/40"
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                row.status === "done"
                  ? "bg-gold-ink text-ivory"
                  : "border border-hairline text-transparent"
              }`}
              aria-hidden
            >
              <Check className="h-3 w-3" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                {row.timeSlot && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-burgundy">
                    <Clock className="h-3 w-3" aria-hidden />
                    {row.timeSlot}
                  </span>
                )}
                {row.isHardStop && (
                  <span className="rounded-full bg-burgundy/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-burgundy">
                    Cannot move
                  </span>
                )}
              </div>
              <p
                className={`text-sm font-semibold ${
                  row.status === "done"
                    ? "text-label-2 line-through"
                    : "text-night"
                }`}
              >
                {row.title}
              </p>
              {row.detail && (
                <p className="mt-0.5 text-xs leading-relaxed text-label-2">
                  {row.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {data.contacts.length > 0 && (
        <section className="mt-8" aria-labelledby="run-sheet-contacts">
          <h2
            id="run-sheet-contacts"
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-label-2"
          >
            Who to ring
          </h2>
          <ul className="space-y-2">
            {data.contacts.map((contact) => (
              <li
                key={contact.id}
                className="rounded-xl border border-hairline/60 bg-white/40 px-4 py-3"
              >
                <p className="text-sm font-semibold text-night">
                  {contact.name}
                </p>
                {contact.person && (
                  <p className="text-xs text-label-2">
                    Ask for {contact.person}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-burgundy underline"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden />
                      {contact.phone}
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="inline-flex min-h-11 items-center gap-1.5 text-sm text-burgundy underline"
                    >
                      <Mail className="h-3.5 w-3.5" aria-hidden />
                      {contact.email}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-center text-[11px] text-label-2">
        This page is kept on your phone, so it still opens when the signal
        drops.
      </p>
    </div>
  );
}
