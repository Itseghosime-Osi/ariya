"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";

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

function ReviewSection({
  icon,
  heading,
  onEdit,
  children,
}: {
  icon: string;
  heading: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="font-label-md text-label-md text-secondary uppercase tracking-widest flex items-center gap-2 font-bold">
          <Icon name={icon} className="text-base text-wine" />
          {heading}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="font-label-md text-label-md text-wine hover:underline font-semibold"
        >
          Edit
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>
    </div>
  );
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
            Perform final solemnization checks before provisioning the
            collaborative workspace.
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-md mb-8">
        <div className="divide-y divide-surface-container-high/60 space-y-6">
          <ReviewSection
            icon="favorite"
            heading="Parties of Honour"
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
                Aṣọ-Ẹbí Protocol
              </p>
              <p className="font-body-md text-body-md text-wine font-medium">
                {dressCode}
              </p>
            </div>
          </ReviewSection>

          <div className="pt-6">
            <ReviewSection
              icon="schedule"
              heading="Timeline &amp; Territorial Pavilion"
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
                  Primary Venue Coordinates
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
              heading="Registry Intake &amp; Sizing"
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
                  Digital Stationery &amp; Sovereign Protocols enabled
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
