"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { createEventAction } from "../actions";

export function CreateEventWizard() {
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [title, setTitle] = useState("");
  const [couple, setCouple] = useState("");
  const [date, setDate] = useState("2026-12-12T14:00");
  const [venue, setVenue] = useState("");
  const [area, setArea] = useState("Victoria Island, Lagos");
  const [dressCode, setDressCode] = useState(
    "Aṣọ-Ẹbí: Burgundy velvet and champagne gold"
  );
  const [targetParties, setTargetParties] = useState(200);
  const [intakeMethod, setIntakeMethod] = useState<"csv" | "manual" | "skip">(
    "csv"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdEvent, setCreatedEvent] = useState<{
    eventId: string;
    slug: string;
  } | null>(null);

  const handleCreate = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await createEventAction({
        title: title || `${couple}'s Nuptials`,
        couple,
        date,
        venue,
        area,
        dressCode,
        targetParties,
        intakeMethod,
      });

      if (!result.ok) {
        setErrorMessage(result.error);
      } else if (result.data) {
        setCreatedEvent(result.data);
      }
    });
  };

  // If successfully created, display Success Provisioned state (Screen V2 13 Inset State 1)
  if (createdEvent) {
    return (
      <section className="bg-surface-container-lowest rounded-2xl p-8 lg:p-12 shadow-xl relative overflow-hidden max-w-4xl mx-auto my-8 border border-surface-container-high">
        {/* Top Gold Foil Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gold" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-success-surface text-success flex items-center justify-center shrink-0 shadow-sm">
              <Icon name="task_alt" className="text-3xl text-success" />
            </div>
            <div>
              <span className="font-label-sm text-label-sm text-gold uppercase tracking-widest block mb-1 font-bold">
                PROVISIONING COMPLETED
              </span>
              <h2 className="font-headline-md text-headline-md text-wine tracking-tight mb-2">
                Celebration Workspace Ready!
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
                Celebration registered for{" "}
                <strong className="text-paper-ink font-semibold">
                  {couple || title}
                </strong>
                . Collaborative stationery and guest registry workspace
                provisioned.
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
              href={`/events/${createdEvent.eventId}`}
              className="px-6 py-2.5 rounded-lg bg-gold text-night hover:bg-gold/90 transition-all font-label-md text-label-md flex items-center justify-center gap-2 shadow-sm font-semibold min-h-[44px]"
            >
              <span>Open Celebration Desk</span>
              <Icon name="arrow_forward" className="text-base" />
            </Link>
          </div>
        </div>

        {/* Quick Stat Chips */}
        <div className="mt-8 pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface-container-low p-4 rounded-xl border border-surface-container">
          <div>
            <span className="block font-label-sm text-label-sm text-mist uppercase font-semibold">
              Designated Date
            </span>
            <span className="font-title-md text-title-md text-paper-ink font-bold">
              {new Date(date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <div>
            <span className="block font-label-sm text-label-sm text-mist uppercase font-semibold">
              Expected Turnout
            </span>
            <span className="font-title-md text-title-md text-wine font-bold">
              {targetParties * 2} Guests
            </span>
          </div>
          <div>
            <span className="block font-label-sm text-label-sm text-mist uppercase font-semibold">
              Pavilion Zoning
            </span>
            <span className="font-title-md text-title-md text-paper-ink font-bold">
              {area || "Lagos"}
            </span>
          </div>
          <div>
            <span className="block font-label-sm text-label-sm text-mist uppercase font-semibold">
              Registry Mode
            </span>
            <span className="font-title-md text-title-md text-success font-bold uppercase">
              {intakeMethod}
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col w-full pb-24">
      {/* Wizard Header */}
      <section className="mb-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-wine hover:underline uppercase tracking-wider mb-2 font-semibold"
            >
              <Icon name="arrow_back" className="text-sm" />
              <span>Back to Portfolio</span>
            </Link>
            <h1 className="font-headline-lg text-headline-lg text-wine tracking-tight">
              Create &amp; Orchestrate Celebration
            </h1>
          </div>
          <div className="flex items-center gap-3 text-on-surface-variant font-label-md text-label-md">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-paper-ink">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span>Autosave Ready</span>
            </span>
            <span className="text-mist">•</span>
            <span className="text-secondary font-semibold">
              Workspace Pipeline
            </span>
          </div>
        </div>

        {/* Stepper Navigation Ribbon */}
        <div className="bg-surface-container-low rounded-xl p-3 shadow-sm border border-surface-container-high">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Step 1 Button */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`rounded-lg p-3.5 flex items-center justify-between text-left transition-all ${
                currentStep === 1
                  ? "bg-wine text-on-primary shadow-md"
                  : currentStep > 1
                    ? "bg-surface-container-lowest text-paper-ink shadow-xs"
                    : "bg-surface-container opacity-80"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-label-md text-label-md font-bold ${
                    currentStep === 1
                      ? "bg-gold text-night"
                      : currentStep > 1
                        ? "bg-success-surface text-success"
                        : "bg-surface-dim text-mist"
                  }`}
                >
                  {currentStep > 1 ? (
                    <Icon name="check" className="text-base" />
                  ) : (
                    "1"
                  )}
                </div>
                <div>
                  <p
                    className={`font-label-sm text-label-sm uppercase tracking-wider font-semibold ${
                      currentStep === 1 ? "text-gold" : "text-secondary"
                    }`}
                  >
                    Step 01
                  </p>
                  <p className="font-title-md text-title-md font-semibold">
                    Celebration Details
                  </p>
                </div>
              </div>
              <Icon
                name={currentStep > 1 ? "verified" : "edit"}
                className={`text-lg ${
                  currentStep === 1 ? "text-gold" : "text-mist"
                }`}
              />
            </button>

            {/* Step 2 Button */}
            <button
              type="button"
              onClick={() => {
                if (couple && venue) setCurrentStep(2);
              }}
              className={`rounded-lg p-3.5 flex items-center justify-between text-left transition-all ${
                currentStep === 2
                  ? "bg-wine text-on-primary shadow-md"
                  : currentStep > 2
                    ? "bg-surface-container-lowest text-paper-ink shadow-xs"
                    : "bg-surface-container opacity-80"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-label-md text-label-md font-bold ${
                    currentStep === 2
                      ? "bg-gold text-night"
                      : currentStep > 2
                        ? "bg-success-surface text-success"
                        : "bg-surface-dim text-mist"
                  }`}
                >
                  {currentStep > 2 ? (
                    <Icon name="check" className="text-base" />
                  ) : (
                    "2"
                  )}
                </div>
                <div>
                  <p
                    className={`font-label-sm text-label-sm uppercase tracking-wider font-semibold ${
                      currentStep === 2 ? "text-gold" : "text-secondary"
                    }`}
                  >
                    Step 02
                  </p>
                  <p className="font-title-md text-title-md font-semibold">
                    Guest Registry Setup
                  </p>
                </div>
              </div>
              <Icon
                name={currentStep > 2 ? "verified" : "groups"}
                className={`text-lg ${
                  currentStep === 2 ? "text-gold" : "text-mist"
                }`}
              />
            </button>

            {/* Step 3 Button */}
            <button
              type="button"
              onClick={() => {
                if (couple && venue) setCurrentStep(3);
              }}
              className={`rounded-lg p-3.5 flex items-center justify-between text-left transition-all ${
                currentStep === 3
                  ? "bg-wine text-on-primary shadow-md"
                  : "bg-surface-container opacity-80"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-label-md text-label-md font-bold ${
                    currentStep === 3
                      ? "bg-gold text-night"
                      : "bg-surface-dim text-mist"
                  }`}
                >
                  3
                </div>
                <div>
                  <p
                    className={`font-label-sm text-label-sm uppercase tracking-wider font-semibold ${
                      currentStep === 3 ? "text-gold" : "text-secondary"
                    }`}
                  >
                    Step 03
                  </p>
                  <p className="font-title-md text-title-md font-semibold">
                    Review &amp; Finalize
                  </p>
                </div>
              </div>
              <Icon
                name="auto_awesome"
                className={`text-lg ${
                  currentStep === 3 ? "text-gold" : "text-mist"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Error alert */}
      {errorMessage && (
        <div
          className="rounded-xl p-4 bg-error-container/80 flex items-start space-x-3 mb-6 shadow-sm"
          role="alert"
        >
          <Icon
            name="error"
            className="text-error text-xl shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="font-body-sm text-body-sm text-on-error-container">
            {errorMessage}
          </p>
        </div>
      )}

      {/* STAGE 1: Celebration Details */}
      {currentStep === 1 && (
        <section className="bg-surface-container-low rounded-xl p-6 sm:p-8 shadow-sm border border-surface-container-high">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-wine/10 text-wine flex items-center justify-center font-headline-sm text-headline-sm font-bold">
              I
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-wine tracking-tight">
                Stage 1: Celebration Details
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Core ceremonial schedule, couple names, and venue coordinates.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Couple Designation */}
            <div className="md:col-span-2 bg-surface-container-lowest p-4 rounded-xl shadow-xs">
              <label
                className="block font-label-md text-label-md text-secondary uppercase tracking-wider mb-1.5 font-semibold"
                htmlFor="couple"
              >
                Couple Designation / Celebrants *
              </label>
              <input
                id="couple"
                type="text"
                className="w-full bg-paper px-4 py-3 rounded-xl font-headline-sm text-headline-sm text-paper-ink shadow-inner outline-none focus:bg-white"
                placeholder="e.g. Chidinma & Tunde"
                value={couple}
                onChange={(e) => setCouple(e.target.value)}
                required
              />
            </div>

            {/* Title */}
            <div className="md:col-span-2 bg-surface-container-lowest p-4 rounded-xl shadow-xs">
              <label
                className="block font-label-md text-label-md text-secondary uppercase tracking-wider mb-1.5 font-semibold"
                htmlFor="title"
              >
                Celebration Title
              </label>
              <input
                id="title"
                type="text"
                className="w-full bg-paper px-4 py-3 rounded-xl font-body-lg text-body-lg text-paper-ink shadow-inner outline-none focus:bg-white"
                placeholder={
                  couple
                    ? `${couple}'s Nuptials`
                    : "e.g. Chidinma & Tunde's Nuptials"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Date & Time */}
            <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs">
              <label
                className="block font-label-md text-label-md text-secondary uppercase tracking-wider mb-1.5 font-semibold"
                htmlFor="eventDate"
              >
                Ceremonial Date &amp; Time (WAT) *
              </label>
              <input
                id="eventDate"
                type="datetime-local"
                className="w-full bg-paper px-4 py-3 rounded-xl font-body-md text-body-md text-paper-ink shadow-inner outline-none focus:bg-white"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <span className="font-body-sm text-body-sm text-mist block mt-1">
                Times displayed in Africa/Lagos (West Africa Time)
              </span>
            </div>

            {/* Area / District */}
            <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs">
              <label
                className="block font-label-md text-label-md text-secondary uppercase tracking-wider mb-1.5 font-semibold"
                htmlFor="area"
              >
                District / Zone
              </label>
              <input
                id="area"
                type="text"
                className="w-full bg-paper px-4 py-3 rounded-xl font-body-md text-body-md text-paper-ink shadow-inner outline-none focus:bg-white"
                placeholder="e.g. Victoria Island, Lagos"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>

            {/* Primary Venue */}
            <div className="md:col-span-2 bg-surface-container-lowest p-4 rounded-xl shadow-xs">
              <label
                className="block font-label-md text-label-md text-secondary uppercase tracking-wider mb-1.5 font-semibold"
                htmlFor="venue"
              >
                Primary Reception Pavilion / Venue *
              </label>
              <input
                id="venue"
                type="text"
                className="w-full bg-paper px-4 py-3 rounded-xl font-body-md text-body-md text-paper-ink shadow-inner outline-none focus:bg-white"
                placeholder="e.g. The Grand Pavilion, Plot 14 Water Corporation Dr"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                required
              />
            </div>

            {/* Dress Code / Aṣọ-Ẹbí */}
            <div className="md:col-span-2 bg-surface-container-lowest p-4 rounded-xl shadow-xs">
              <label
                className="block font-label-md text-label-md text-secondary uppercase tracking-wider mb-1.5 font-semibold"
                htmlFor="dressCode"
              >
                Aṣọ-Ẹbí Protocol &amp; Dress Code
              </label>
              <input
                id="dressCode"
                type="text"
                className="w-full bg-paper px-4 py-3 rounded-xl font-body-md text-body-md text-paper-ink shadow-inner outline-none focus:bg-white"
                placeholder="e.g. Aṣọ-Ẹbí: Burgundy velvet and champagne gold"
                value={dressCode}
                onChange={(e) => setDressCode(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              disabled={!couple.trim() || !venue.trim()}
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 rounded-xl bg-wine hover:bg-night text-ivory font-label-lg text-label-lg flex items-center gap-2 shadow-md transition-all disabled:opacity-50 min-h-[44px]"
            >
              <span>Continue to Guest Registry Setup</span>
              <Icon name="arrow_forward" className="text-base" />
            </button>
          </div>
        </section>
      )}

      {/* STAGE 2: Guest Registry Setup */}
      {currentStep === 2 && (
        <section className="bg-surface-container-low rounded-xl p-6 sm:p-8 shadow-sm border border-surface-container-high">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-wine/10 text-wine flex items-center justify-center font-headline-sm text-headline-sm font-bold">
              II
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-wine tracking-tight">
                Stage 2: Guest Registry Setup
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Intake methodology, seating quota calculation, and party sizing.
              </p>
            </div>
          </div>

          {/* 3 Method Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <button
              type="button"
              onClick={() => setIntakeMethod("csv")}
              className={`rounded-xl p-5 text-left transition-all flex flex-col justify-between ${
                intakeMethod === "csv"
                  ? "bg-surface-container-lowest shadow-md ring-2 ring-gold"
                  : "bg-surface-container hover:bg-surface-container-lowest"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-gold/20 text-secondary flex items-center justify-center">
                    <Icon name="table_view" className="text-xl text-wine" />
                  </div>
                  {intakeMethod === "csv" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-wine text-ivory font-label-sm text-label-sm font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <h3 className="font-title-lg text-title-lg text-paper-ink mb-1 font-semibold">
                  Upload CSV Spreadsheet
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
                  Master roll aggregated from both family liaison committees.
                </p>
              </div>
              <div className="bg-surface-container p-3 rounded-lg flex items-center gap-2 text-wine font-label-sm font-semibold">
                <Icon name="attachment" className="text-base" />
                <span>Import via Guestbook next</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIntakeMethod("manual")}
              className={`rounded-xl p-5 text-left transition-all flex flex-col justify-between ${
                intakeMethod === "manual"
                  ? "bg-surface-container-lowest shadow-md ring-2 ring-gold"
                  : "bg-surface-container hover:bg-surface-container-lowest"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high text-paper-ink flex items-center justify-center">
                    <Icon name="person_add" className="text-xl text-wine" />
                  </div>
                  {intakeMethod === "manual" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-wine text-ivory font-label-sm text-label-sm font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <h3 className="font-title-lg text-title-lg text-paper-ink mb-1 font-semibold">
                  Add Guests Manually
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
                  Direct bespoke entry for VIP tables, elders, and monarchs.
                </p>
              </div>
              <div className="bg-surface-container p-3 rounded-lg text-on-surface-variant font-label-sm">
                <span>Direct portal input</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIntakeMethod("skip")}
              className={`rounded-xl p-5 text-left transition-all flex flex-col justify-between ${
                intakeMethod === "skip"
                  ? "bg-surface-container-lowest shadow-md ring-2 ring-gold"
                  : "bg-surface-container hover:bg-surface-container-lowest"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high text-paper-ink flex items-center justify-center">
                    <Icon name="fast_forward" className="text-xl text-wine" />
                  </div>
                  {intakeMethod === "skip" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-wine text-ivory font-label-sm text-label-sm font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <h3 className="font-title-lg text-title-lg text-paper-ink mb-1 font-semibold">
                  Skip for Now
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
                  Preserve ballroom dimensions and estimate attendance.
                </p>
              </div>
              <div className="bg-surface-container p-3 rounded-lg text-on-surface-variant font-label-sm">
                <span>Start with blank roster</span>
              </div>
            </button>
          </div>

          {/* Capacity Stepper */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5">
                <label className="block font-label-md text-label-md text-secondary uppercase tracking-wider mb-1 font-semibold">
                  Seating Quota • Parties Stepper
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setTargetParties(Math.max(10, targetParties - 10))
                    }
                    className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-paper-ink hover:bg-surface-container-high transition-colors"
                  >
                    <Icon name="remove" className="text-lg" />
                  </button>
                  <div className="px-6 py-2 bg-surface rounded-lg text-center shadow-xs">
                    <span className="font-headline-md text-headline-md text-wine font-bold">
                      {targetParties}
                    </span>
                    <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                      Invited Parties
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTargetParties(targetParties + 10)}
                    className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-paper-ink hover:bg-surface-container-high transition-colors"
                  >
                    <Icon name="add" className="text-lg" />
                  </button>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                  Estimated calculation:{" "}
                  <strong>{targetParties * 2} attendees</strong> (avg. 2 pax /
                  envelope).
                </p>
              </div>

              <div className="md:col-span-7 flex flex-col gap-3">
                <div className="flex justify-between items-center text-body-sm font-body-sm">
                  <span className="text-paper-ink font-semibold">
                    {venue || "Reception Pavilion"} Seating Allocation
                  </span>
                  <span className="text-wine font-bold">
                    {targetParties * 2} Capacity
                  </span>
                </div>
                <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-wine rounded-full w-4/5" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 rounded-lg bg-surface-container text-paper-ink hover:bg-surface-variant transition-colors font-label-md min-h-[44px]"
            >
              Previous Step
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-6 py-3 rounded-xl bg-wine hover:bg-night text-ivory font-label-lg text-label-lg flex items-center gap-2 shadow-md transition-all min-h-[44px]"
            >
              <span>Continue to Review</span>
              <Icon name="arrow_forward" className="text-base" />
            </button>
          </div>
        </section>
      )}

      {/* STAGE 3: Review & Finalize */}
      {currentStep === 3 && (
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
              {/* Part 1 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-label-md text-label-md text-secondary uppercase tracking-widest flex items-center gap-2 font-bold">
                    <Icon name="favorite" className="text-base text-wine" />
                    Parties of Honour
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="font-label-md text-label-md text-wine hover:underline font-semibold"
                  >
                    Edit Details
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Couple Designation
                    </p>
                    <p className="font-headline-sm text-headline-sm text-paper-ink">
                      {couple}
                    </p>
                  </div>
                  <div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Celebration Title
                    </p>
                    <p className="font-title-lg text-title-lg text-paper-ink font-semibold">
                      {title || `${couple}'s Nuptials`}
                    </p>
                  </div>
                  <div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Atmosphere / Dress Code
                    </p>
                    <p className="font-body-md text-body-md text-wine font-medium">
                      {dressCode}
                    </p>
                  </div>
                </div>
              </div>

              {/* Part 2 */}
              <div className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-label-md text-label-md text-secondary uppercase tracking-widest flex items-center gap-2 font-bold">
                    <Icon name="schedule" className="text-base text-wine" />
                    Timeline &amp; Territorial Pavilion
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="font-label-md text-label-md text-wine hover:underline font-semibold"
                  >
                    Edit Schedule
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Date &amp; Time
                    </p>
                    <p className="font-title-lg text-title-lg text-paper-ink font-semibold">
                      {new Date(date).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Africa/Lagos",
                      })}
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
                </div>
              </div>

              {/* Part 3 */}
              <div className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-label-md text-label-md text-secondary uppercase tracking-widest flex items-center gap-2 font-bold">
                    <Icon name="groups" className="text-base text-wine" />
                    Registry Intake &amp; Sizing
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="font-label-md text-label-md text-wine hover:underline font-semibold"
                  >
                    Edit Guest Setup
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Initial Ingestion Mode
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
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 rounded-lg bg-surface-container text-paper-ink hover:bg-surface-variant transition-colors font-label-md min-h-[44px]"
            >
              Previous Step
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleCreate}
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
      )}
    </div>
  );
}
