"use client";

import Link from "next/link";
import { Check, Lock, Mail, Phone, WifiOff } from "lucide-react";
import { ScreenHeader } from "@/components/layout/screen-header";
import {
  DeskItem,
  DeskMotion,
} from "@/features/events/components/desk/DeskMotion";
import type { RunSheetData } from "@/features/day-of/queries";

const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink";
const CARD = "rounded-3xl border border-hairline bg-white/40 backdrop-blur-sm";
const CONTACT_BTN =
  "desk-chip inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

/**
 * The day itself, as a sheet you can hold in one hand (6.4.4).
 *
 * Deliberately quiet: a time, what happens, and whether it is done. Nothing here is editable on the
 * day: the checklist is where a host changes their mind, and a run sheet that could be rewritten
 * under pressure is a liability rather than a help.
 */
export function RunSheetClient({ data }: { data: RunSheetData }) {
  const header = (
    <ScreenHeader
      title="Run sheet"
      subtitle={data.eventTitle}
      backHref={`/events/${data.eventId}`}
    />
  );

  if (data.rows.length === 0) {
    return (
      <div className="sm:pb-16">
        {header}
        <div className="mx-auto flex max-w-xl flex-col items-center px-2 py-12 text-center">
          <h1 className="font-display text-3xl font-semibold text-night">
            Run sheet
          </h1>
          <div
            aria-hidden="true"
            className="mx-auto mt-3 flex w-32 items-center gap-2 text-gold-ink"
          >
            <span className="h-px flex-1 bg-current opacity-40" />
            <span className="text-[10px] leading-none">✦</span>
            <span className="h-px flex-1 bg-current opacity-40" />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-label-2">
            Nothing is scheduled for the day itself yet. It fills in once the
            checklist has been generated.
          </p>
          <Link
            href={`/events/${data.eventId}/checklist`}
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-burgundy px-6 text-sm font-semibold text-ivory shadow-[0_8px_20px_-8px_rgba(110,20,38,0.6)] hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            Open the checklist
          </Link>
        </div>
      </div>
    );
  }

  const total = data.rows.length;
  const percent = Math.round((data.doneCount / total) * 100);
  const next = data.rows.find(
    (row) => row.status !== "done" && row.status !== "skipped"
  );
  const hardStops = data.rows.filter((row) => row.isHardStop).length;
  const finished = data.doneCount === total;

  return (
    <div className="sm:pb-16">
      {header}
      <DeskMotion className="mx-auto flex max-w-3xl flex-col gap-5 pb-8 sm:gap-6">
        <DeskItem className="flex flex-col gap-1 standalone:max-md:hidden sm:gap-2">
          <p className={EYEBROW}>Run sheet</p>
          <h1 className="font-serif text-3xl font-bold leading-tight text-on-surface sm:text-5xl">
            The order of the day
          </h1>
          <p className="truncate text-sm text-label-2">{data.eventTitle}</p>
        </DeskItem>

        <DeskItem>
          <section
            aria-label="Where the day stands"
            className="profile-card relative overflow-hidden rounded-[28px] p-5 sm:p-6"
          >
            <span aria-hidden="true" className="profile-card__weave" />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#f3d98f]">
                {finished ? "The day is done" : "The day so far"}
              </p>
              <p className="mt-1 flex items-baseline gap-2 font-display text-[#fff6dc]">
                <span className="text-5xl font-semibold leading-none">
                  {data.doneCount}
                </span>
                <span className="text-xl text-[#f4e8cc]">of {total} done</span>
              </p>
              <div
                role="progressbar"
                aria-label="Run sheet progress"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={data.doneCount}
                className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#f6e2ad] to-[#d4a85a] transition-[width] duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>

              {hardStops > 0 && (
                <p className="mt-3 flex items-center gap-2 text-[13px] text-[#f4e8cc]">
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {hardStops === 1
                    ? "One time cannot move."
                    : `${hardStops} times cannot move.`}
                </p>
              )}
            </div>
          </section>
        </DeskItem>

        <DeskItem>
          <ol className="relative space-y-3">
            <span
              aria-hidden="true"
              className="absolute bottom-6 left-[19px] top-6 w-px bg-gradient-to-b from-gold/60 via-gold/30 to-transparent"
            />
            {data.rows.map((row, index) => {
              const done = row.status === "done";
              const isNext = next?.id === row.id;
              return (
                <li key={row.id} className="relative flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`relative z-10 mt-3 grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-bold ${
                      done
                        ? "bg-burgundy text-ivory ring-1 ring-gold/60"
                        : isNext
                          ? "bg-ivory text-burgundy ring-2 ring-gold"
                          : row.isHardStop
                            ? "bg-ivory text-burgundy ring-1 ring-burgundy/50"
                            : "bg-ivory text-label-2 ring-1 ring-hairline"
                    }`}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : row.isHardStop ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      index + 1
                    )}
                  </span>

                  <div
                    className={`min-w-0 flex-1 px-4 py-3.5 ${CARD} ${
                      row.isHardStop ? "!border-burgundy/45" : ""
                    } ${isNext ? "!border-gold shadow-[0_14px_30px_-20px_rgba(212,168,90,0.8)]" : ""} ${
                      done ? "opacity-75" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {row.timeSlot && (
                        <span className="font-display text-[1.05rem] font-semibold leading-tight text-gold-ink">
                          {row.timeSlot}
                        </span>
                      )}
                      {isNext && (
                        <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gold-ink">
                          Next up
                        </span>
                      )}
                      {row.isHardStop && (
                        <span className="rounded-full bg-burgundy/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-burgundy">
                          Cannot move
                        </span>
                      )}
                      {done && (
                        <span className="rounded-full bg-night/[0.07] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-label-2">
                          Done
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-1 text-[15px] font-semibold leading-snug ${
                        done ? "text-label-2 line-through" : "text-night"
                      }`}
                    >
                      {row.title}
                    </p>
                    {row.detail && (
                      <p className="mt-1 text-[13px] leading-relaxed text-label-2">
                        {row.detail}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </DeskItem>

        {data.contacts.length > 0 && (
          <DeskItem>
            <section aria-labelledby="run-sheet-contacts">
              <h2 id="run-sheet-contacts" className={`mb-2 px-1 ${EYEBROW}`}>
                Who to ring
              </h2>
              <ul
                className={`${CARD} divide-y divide-hairline overflow-hidden`}
              >
                {data.contacts.map((contact) => (
                  <li key={contact.id} className="px-4 py-3.5">
                    <p className="text-[15px] font-semibold text-night">
                      {contact.name}
                    </p>
                    {contact.person && (
                      <p className="text-[13px] text-label-2">
                        Ask for {contact.person}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                          className={CONTACT_BTN}
                        >
                          <Phone className="h-4 w-4" aria-hidden />
                          {contact.phone}
                        </a>
                      )}
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className={CONTACT_BTN}
                        >
                          <Mail className="h-4 w-4" aria-hidden />
                          {contact.email}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </DeskItem>
        )}

        <DeskItem>
          <p className="mx-auto flex max-w-sm items-center justify-center gap-2 text-center text-[12px] leading-relaxed text-label-2">
            <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Kept on your phone, so it still opens when the signal drops.
          </p>
        </DeskItem>
      </DeskMotion>
    </div>
  );
}
