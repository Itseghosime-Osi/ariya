import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatLagosDate, formatLagosTime } from "@/lib/format";
import type { InvitationData } from "../types";

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
  const formattedDate = formatLagosDate(event.date);
  const formattedTime = formatLagosTime(event.date);

  return (
    <article className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-wine via-gold to-wine" />

      {/* Confirmation Crest */}
      <section className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Icon name="verified" className="text-sm text-emerald-600" />
          <span>
            {isAccepted ? "RSVP Confirmed & Honoured" : "Regrets Recorded"}
          </span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl text-wine font-medium leading-tight">
          {isAccepted
            ? `We Look Forward to Celebrating with You, ${guest.display_name}!`
            : `You Will Be Deeply Missed, ${guest.display_name}`}
        </h1>
        <p className="font-serif text-lg italic text-wine/80">
          The Nuptials of {event.couple}
        </p>
      </section>

      {/* Guest Pass Ticket Container */}
      <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 space-y-4">
        <div className="flex items-center justify-between border-b border-wine/10 pb-3">
          <span className="text-xs uppercase tracking-wider text-wine/70 font-semibold">
            Digital Celebration Pass
          </span>
          <span className="font-mono text-xs font-semibold text-wine bg-white/70 px-2 py-0.5 rounded border border-wine/20">
            {isAccepted
              ? `${rsvp?.attending_count ?? 1} ATTENDEE(S)`
              : "DECLINED"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-wine/70 font-semibold block">
              Event Date
            </span>
            <p className="font-medium text-night text-sm">{formattedDate}</p>
            <p className="text-wine/80">{formattedTime}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-wine/70 font-semibold block">
              Venue
            </span>
            <p className="font-medium text-night text-sm">{event.venue}</p>
            {event.area && <p className="text-wine/80">{event.area}</p>}
          </div>

          {isAccepted && table_name && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-wine/70 font-semibold block">
                Assigned Table
              </span>
              <p className="font-medium text-night text-sm flex items-center gap-1.5 text-wine">
                <Icon name="table_restaurant" className="text-sm" />
                <span>{table_name}</span>
              </p>
            </div>
          )}

          {isAccepted && rsvp?.plus_one_name && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-wine/70 font-semibold block">
                Accompanied By
              </span>
              <p className="font-medium text-night text-sm">
                {rsvp.plus_one_name}
              </p>
            </div>
          )}
        </div>

        {isAccepted && rsvp?.dietary && (
          <div className="pt-2 border-t border-wine/10 text-xs">
            <span className="text-[10px] uppercase tracking-wider text-wine/70 font-semibold block">
              Dietary & Allergies
            </span>
            <p className="text-night italic">{rsvp.dietary}</p>
          </div>
        )}
      </section>

      {/* Dress Code Note */}
      {event.dress_code && (
        <section className="bg-wine/5 rounded-xl p-4 border border-wine/10 text-xs space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-wine font-bold block flex items-center gap-1">
            <Icon name="palette" className="text-xs" />
            Dress Code & Aso-Ebi Traditions
          </span>
          <p className="text-night">{event.dress_code}</p>
        </section>
      )}

      {/* Royal Check-In Pass */}
      {isAccepted && checkInCode && qrCodeUrl && (
        <section className="bg-white rounded-xl p-5 border border-wine/20 text-center space-y-3 shadow-xs">
          <div className="flex items-center justify-center gap-1.5 text-wine">
            <Icon name="qr_code_scanner" className="text-sm" />
            <span className="text-[11px] font-bold uppercase tracking-widest">
              Reception Entry Pass
            </span>
          </div>
          <div className="inline-block p-2 bg-surface-container-lowest rounded-xl border border-wine/10 shadow-inner">
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
            <span className="text-[10px] uppercase tracking-wider text-wine/70 font-semibold block">
              Personal Entry Code
            </span>
            <span className="font-mono text-base font-bold text-wine tracking-wider bg-wine/5 px-3 py-1 rounded-md border border-wine/20 inline-block">
              {checkInCode}
            </span>
          </div>
          <p className="text-[11px] text-wine/70 max-w-xs mx-auto">
            Present this digital QR pass or mention your personal code to the
            usher or check-in team at the reception desk.
          </p>
        </section>
      )}

      {/* Revision Action */}
      <section className="text-center pt-2">
        <Link
          href={`/i/${token}?revise=true`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-wine/40 text-wine hover:bg-wine/5 text-xs font-semibold transition-colors"
        >
          <Icon name="edit" className="text-sm" />
          <span>Update RSVP or dietary preferences</span>
        </Link>
      </section>
    </article>
  );
}
