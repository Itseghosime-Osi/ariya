import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatEventDate } from "@/lib/format";
import { pluralise } from "@/lib/metrics";
import type { InvitationData } from "../types";
import { getGuestTheme } from "../themes";

interface RsvpSummaryCardProps {
  data: InvitationData;
  token: string;
  checkInCode?: string | null;
  qrCodeUrl?: string | null;
}

export function RsvpSummaryCard({
  data,
  token,
  checkInCode,
  qrCodeUrl,
}: RsvpSummaryCardProps) {
  const { guest, rsvp, event, table_name } = data;
  const isAccepted = rsvp?.status === "accepted";
  const formattedEventDate = formatEventDate(event.date);
  const theme = getGuestTheme(event.invitation_theme);

  return (
    <article className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8 relative overflow-hidden">
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${theme.topBar}`}
      />

      {/* Confirmation Crest */}
      <section className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Icon name="verified" className="text-sm text-emerald-600" />
          <span>
            {isAccepted ? "RSVP Confirmed & Honoured" : "Regrets Recorded"}
          </span>
        </div>
        <h1
          className={`font-serif text-2xl sm:text-3xl font-medium leading-tight ${theme.headline}`}
        >
          {isAccepted
            ? `We Look Forward to Celebrating with You, ${guest.display_name}!`
            : `You Will Be Deeply Missed, ${guest.display_name}`}
        </h1>
        <p className={`font-serif text-lg italic ${theme.subheadline}`}>
          {event.invitation_subheadline || `The Celebration of ${event.couple}`}
        </p>
      </section>

      {/* Guest Pass Ticket Container */}
      <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 space-y-4">
        <div
          className={`flex items-center justify-between border-b pb-3 ${theme.passHeader}`}
        >
          <span className="text-xs uppercase tracking-wider font-semibold">
            Digital Celebration Pass
          </span>
          <span
            className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border ${theme.passBadge}`}
          >
            {isAccepted
              ? pluralise(rsvp?.attending_count ?? 1, "attendee")
              : "DECLINED"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span
              className={`text-[10px] uppercase tracking-wider font-semibold block ${theme.label}`}
            >
              Event Date &amp; Time
            </span>
            <p className="font-medium text-night text-sm">
              {formattedEventDate}
            </p>
          </div>
          <div>
            <span
              className={`text-[10px] uppercase tracking-wider font-semibold block ${theme.label}`}
            >
              Venue
            </span>
            <p className="font-medium text-night text-sm">{event.venue}</p>
            {event.area && <p className={theme.subheadline}>{event.area}</p>}
          </div>

          {isAccepted && table_name && (
            <div>
              <span
                className={`text-[10px] uppercase tracking-wider font-semibold block ${theme.label}`}
              >
                Assigned Table
              </span>
              <p
                className={`font-medium text-sm flex items-center gap-1.5 ${theme.headline}`}
              >
                <Icon name="table_restaurant" className="text-sm" />
                <span>{table_name}</span>
              </p>
            </div>
          )}

          {isAccepted && rsvp?.plus_one_name && (
            <div>
              <span
                className={`text-[10px] uppercase tracking-wider font-semibold block ${theme.label}`}
              >
                Accompanied By
              </span>
              <p className="font-medium text-night text-sm">
                {rsvp.plus_one_name}
              </p>
            </div>
          )}
        </div>

        {isAccepted && rsvp?.dietary && (
          <div className={`pt-2 border-t text-xs ${theme.passHeader}`}>
            <span
              className={`text-[10px] uppercase tracking-wider font-semibold block ${theme.label}`}
            >
              Dietary & Allergies
            </span>
            <p className="text-night italic">{rsvp.dietary}</p>
          </div>
        )}
      </section>

      {/* Dress Code Note */}
      {event.dress_code && (
        <section
          className={`rounded-xl p-4 border text-xs space-y-1 ${theme.noteBox}`}
        >
          <span className="text-[10px] uppercase tracking-wider font-bold block flex items-center gap-1">
            <Icon name="styler" className="text-xs" />
            Dress Code & Aso-Ebi Traditions
          </span>
          <p className="text-night">{event.dress_code}</p>
        </section>
      )}

      {/* Royal Check-In Pass */}
      {isAccepted && checkInCode && qrCodeUrl && (
        <section
          className={`bg-white rounded-xl p-5 border text-center space-y-3 shadow-xs ${theme.qrBox}`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Icon name="qr_code_scanner" className="text-sm" />
            <span className="text-[11px] font-bold uppercase tracking-widest">
              Reception Entry Pass
            </span>
          </div>
          <div className="inline-block p-2 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeUrl}
              alt={`QR Pass for ${guest.display_name}`}
              width={160}
              height={160}
              className="rounded-lg mx-auto"
            />
          </div>
          <div className="space-y-1">
            <span
              className={`text-[10px] uppercase tracking-wider font-semibold block ${theme.label}`}
            >
              Personal Entry Code
            </span>
            <span
              className={`font-mono text-base font-bold tracking-wider px-3 py-1 rounded-md border inline-block ${theme.codeBadge}`}
            >
              {checkInCode}
            </span>
          </div>
          <p className={`text-[11px] max-w-xs mx-auto ${theme.subheadline}`}>
            Present this digital QR pass or mention your personal code to the
            usher or check-in team at the reception desk.
          </p>
        </section>
      )}

      {/* Revision Action */}
      <section className="text-center pt-2">
        <Link
          href={`/i/${token}?revise=true`}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${theme.secondaryButton}`}
        >
          <Icon name="edit" className="text-sm" />
          <span>Update RSVP or dietary preferences</span>
        </Link>
      </section>
    </article>
  );
}
