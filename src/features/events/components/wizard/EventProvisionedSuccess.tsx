"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

interface EventProvisionedSuccessProps {
  eventId: string;
  slug: string;
  couple: string;
  title: string;
  targetParties: number;
}

export function EventProvisionedSuccess({
  eventId,
  slug,
  couple,
  title,
  targetParties,
}: EventProvisionedSuccessProps) {
  return (
    <section className="bg-surface-container-lowest rounded-2xl p-8 lg:p-12 shadow-xl relative overflow-hidden max-w-4xl mx-auto my-8 border border-surface-container-high">
      {/* Top Gold Foil Accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gold" />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-success-surface text-success flex items-center justify-center shrink-0 shadow-sm">
            <Icon name="check_circle" className="text-3xl text-success" />
          </div>
          <div>
            <span className="font-label-sm text-label-sm text-gold uppercase tracking-widest block mb-1 font-bold">
              EVENT CREATED
            </span>
            <h2 className="font-headline-md text-headline-md text-wine tracking-tight mb-2">
              Your Event is Ready!
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
              Celebration registered for{" "}
              <strong className="text-paper-ink font-semibold">
                {couple || title}
              </strong>
              . Your event is ready.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <Link
            href="/events"
            className="px-4 py-2.5 rounded-lg bg-surface-container text-paper-ink hover:bg-surface-container-high transition-colors font-label-md text-label-md flex items-center justify-center gap-2 min-h-[44px]"
          >
            <span>View Portfolio</span>
          </Link>
          <Link
            href={`/events/${eventId}`}
            className="px-6 py-2.5 rounded-lg bg-gold text-night hover:bg-gold/90 transition-all font-label-md text-label-md flex items-center justify-center gap-2 shadow-sm font-semibold min-h-[44px]"
          >
            <span>Open Celebration Desk</span>
            <Icon name="arrow_forward" className="text-base" />
          </Link>
        </div>
      </div>

      {/* Quick Stat Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-surface-container-high/60">
        <div>
          <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase">
            Event URL
          </span>
          <span className="font-title-sm text-title-sm text-wine font-semibold truncate block">
            /{slug}
          </span>
        </div>
        <div>
          <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase">
            Estimated Capacity
          </span>
          <span className="font-title-sm text-title-sm text-paper-ink font-semibold">
            ~{targetParties * 2} Guests (estimate)
          </span>
        </div>
        <div>
          <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase">
            Aṣọ-Ẹbí Details
          </span>
          <span className="font-title-sm text-title-sm text-paper-ink font-semibold">
            Active
          </span>
        </div>
        <div>
          <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase">
            Event Role
          </span>
          <span className="font-title-sm text-title-sm text-paper-ink font-semibold">
            Owner (You)
          </span>
        </div>
      </div>
    </section>
  );
}
