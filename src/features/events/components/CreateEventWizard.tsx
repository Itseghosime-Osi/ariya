"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { createEventAction } from "../actions";
import { EventWizardStepper } from "./wizard/EventWizardStepper";
import { StepCelebrationDetails } from "./wizard/StepCelebrationDetails";
import { StepGuestIntake } from "./wizard/StepGuestIntake";
import { StepReviewLaunch } from "./wizard/StepReviewLaunch";

export function CreateEventWizard() {
  const router = useRouter();
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

  const canNavigateToStep2 = Boolean(couple.trim() && venue.trim());
  const canNavigateToStep3 = canNavigateToStep2;

  const handleCreate = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await createEventAction({
        title: title || `${couple}'s Wedding`,
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
        router.push(`/events/${result.data.eventId}?created=1`);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <EventWizardStepper
        currentStep={currentStep}
        onSelectStep={setCurrentStep}
        canNavigateToStep2={canNavigateToStep2}
        canNavigateToStep3={canNavigateToStep3}
      />

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

      {currentStep === 1 && (
        <StepCelebrationDetails
          couple={couple}
          setCouple={setCouple}
          title={title}
          setTitle={setTitle}
          date={date}
          setDate={setDate}
          area={area}
          setArea={setArea}
          venue={venue}
          setVenue={setVenue}
          dressCode={dressCode}
          setDressCode={setDressCode}
          onNext={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 2 && (
        <StepGuestIntake
          intakeMethod={intakeMethod}
          setIntakeMethod={setIntakeMethod}
          targetParties={targetParties}
          setTargetParties={setTargetParties}
          venue={venue}
          onPrev={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
        />
      )}

      {currentStep === 3 && (
        <StepReviewLaunch
          couple={couple}
          title={title}
          dressCode={dressCode}
          date={date}
          venue={venue}
          area={area}
          intakeMethod={intakeMethod}
          targetParties={targetParties}
          isPending={isPending}
          onPrev={() => setCurrentStep(2)}
          onEditDetails={() => setCurrentStep(1)}
          onEditSchedule={() => setCurrentStep(1)}
          onEditGuestSetup={() => setCurrentStep(2)}
          onLaunch={handleCreate}
        />
      )}
    </div>
  );
}
