"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
import { ReviewSection } from "./ReviewSection";

interface StepReviewLaunchProps {
  couple: string;
  title: string;
  dressCode: string;
  date: string;
  venue: string;
  area: string;
  intakeMethod: "csv" | "manual" | "skip";
  targetParties: number;
  isPending: boolean;
  onPrev: () => void;
  onEditDetails: () => void;
  onEditSchedule: () => void;
  onEditGuestSetup: () => void;
  onLaunch: () => void;
}

export function StepReviewLaunch({
  couple,
  title,
  dressCode,
  date,
  venue,
  area,
  intakeMethod,
  targetParties,
  isPending,
  onPrev,
  onEditDetails,
  onEditSchedule,
  onEditGuestSetup,
  onLaunch,
}: StepReviewLaunchProps) {
  const formattedDate = new Date(date).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });

  return (
    <section className="bg-surface-container-low rounded-xl p-6 sm:p-8 shadow-sm border border-surface-container-high">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-wine text-ivory flex items-center justify-center font-headline-sm text-headline-sm font-bold">
          III
        </div>
        <div>
          <h2 className="font-headline-sm text-headline-sm text-wine tracking-tight">
            Stage 3: Review &amp; Launch Summary
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Review your details, then create the event.
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-md mb-8">
        <div className="divide-y divide-surface-container-high/60 space-y-6">
          <ReviewSection
            icon="favorite"
            heading="Couple"
            onEdit={onEditDetails}
          >
            <div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Couple
              </p>
              <p className="font-headline-sm text-headline-sm text-paper-ink">
                {couple}
              </p>
            </div>
            <div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Title
              </p>
              <p className="font-title-lg text-title-lg text-paper-ink font-semibold">
                {title || `${couple}'s Nuptials`}
              </p>
            </div>
            <div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Aṣọ-Ẹbí &amp; Dress Code
              </p>
              <p className="font-body-md text-body-md text-wine font-medium">
                {dressCode}
              </p>
            </div>
          </ReviewSection>

          <div className="pt-6">
            <ReviewSection
              icon="schedule"
              heading="Date, Time &amp; Venue"
              onEdit={onEditSchedule}
            >
              <div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Date &amp; Time
                </p>
                <p className="font-title-lg text-title-lg text-paper-ink font-semibold">
                  {formattedDate}
                </p>
                <p className="font-body-sm text-body-sm text-mist">
                  Africa/Lagos (WAT)
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Venue Location
                </p>
                <p className="font-title-lg text-title-lg text-paper-ink font-semibold">
                  {venue}
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {area}
                </p>
              </div>
            </ReviewSection>
          </div>

          <div className="pt-6">
            <ReviewSection
              icon="groups"
              heading="Guest List Sizing"
              onEdit={onEditGuestSetup}
            >
              <div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Initial Ingestion
                </p>
                <p className="font-title-lg text-title-lg text-paper-ink font-semibold uppercase">
                  {intakeMethod}
                </p>
              </div>
              <div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Target Capacity
                </p>
                <p className="font-title-lg text-title-lg text-paper-ink font-semibold">
                  {targetParties} parties ({targetParties * 2} attendees)
                </p>
              </div>
              <div className="bg-surface-container p-3 rounded-lg flex items-center gap-3">
                <Icon name="verified" className="text-xl text-gold" />
                <span className="font-body-sm text-body-sm text-paper-ink">
                  Digital Invitations &amp; RSVP Links enabled
                </span>
              </div>
            </ReviewSection>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="px-5 py-2.5 rounded-lg bg-surface-container text-paper-ink hover:bg-surface-variant transition-colors font-label-md min-h-[44px]"
        >
          Previous Step
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onLaunch}
          className="px-8 py-3.5 rounded-xl bg-wine hover:bg-night text-ivory font-label-lg text-label-lg shadow-lg flex items-center gap-2 font-semibold transition-all min-h-[44px] disabled:opacity-75"
        >
          {isPending ? (
            <span>Provisioning Celebration Workspace...</span>
          ) : (
            <>
              <span>Create Celebration Workspace</span>
              <Icon name="arrow_forward" className="text-lg text-gold" />
            </>
          )}
        </button>
      </div>
    </section>
  );
}
