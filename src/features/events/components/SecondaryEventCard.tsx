import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatEventDate } from "@/lib/format";
import { formatEventCardMetrics } from "@/lib/metrics";

interface SecondaryEventCardProps {
  id: string;
  title: string;
  category: string;
  dateStr: string;
  venueStr: string;
  daysAway: number;
  totalInvited: number;
  confirmed: number;
  rsvpRate: number;
  description: string;
  statusBadge: string;
  iconName: string;
}

export function SecondaryEventCard({
  id,
  title,
  category,
  dateStr,
  venueStr,
  daysAway,
  totalInvited,
  confirmed,
  rsvpRate,
  description,
  statusBadge,
  iconName,
}: SecondaryEventCardProps) {
  return (
    <article className="bg-paper rounded-[24px] p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between mb-space-sm">
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm font-semibold">
            {category}
          </span>
          <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
            <Icon name="schedule" className="text-secondary text-base" />
            <span>{daysAway} days away</span>
          </div>
        </div>

        <div className="flex items-start gap-space-md">
          <div className="w-16 h-16 rounded-2xl bg-secondary-fixed/50 flex-shrink-0 flex items-center justify-center text-secondary shadow-sm">
            <Icon name={iconName} className="text-3xl text-wine" />
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm text-night group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              {formatEventDate(dateStr)} • {venueStr}
            </p>
            <p className="font-label-sm text-label-sm text-wine font-semibold mt-1">
              {formatEventCardMetrics({
                totalParties: totalInvited,
                acceptedGuests: confirmed,
                rsvpRate,
              })}
            </p>
          </div>
        </div>

        <div className="my-space-md p-space-sm bg-surface-container rounded-xl grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
              Parties
            </div>
            <div className="font-headline-sm text-headline-sm text-night mt-0.5">
              {totalInvited}
            </div>
          </div>
          <div>
            <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
              Attending
            </div>
            <div className="font-headline-sm text-headline-sm text-success mt-0.5">
              {confirmed}
            </div>
          </div>
          <div>
            <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
              Responded
            </div>
            <div className="font-headline-sm text-headline-sm text-secondary mt-0.5">
              {rsvpRate}%
            </div>
          </div>
        </div>

        <p className="font-body-sm text-body-sm text-paper-ink line-clamp-2">
          {description}
        </p>
      </div>

      <div className="pt-space-md mt-space-md flex items-center justify-between border-t border-surface-container-high">
        <div className="flex items-center gap-1.5 text-label-sm font-label-sm text-on-surface-variant">
          <Icon name="verified_user" className="text-success text-base" />
          <span>{statusBadge}</span>
        </div>
        <Link
          href={`/events/${id}`}
          className="px-space-md py-2 rounded-xl bg-ivory hover:bg-gold text-night font-label-md text-label-md font-semibold transition-all flex items-center gap-1 min-h-[44px]"
        >
          <span>Manage Desk</span>
          <Icon name="arrow_forward" className="text-sm" />
        </Link>
      </div>
    </article>
  );
}
