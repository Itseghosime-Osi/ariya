"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

interface EventWizardStepperProps {
  currentStep: 1 | 2 | 3;
  onSelectStep: (step: 1 | 2 | 3) => void;
  canNavigateToStep2: boolean;
  canNavigateToStep3: boolean;
}

export function EventWizardStepper({
  currentStep,
  onSelectStep,
  canNavigateToStep2,
  canNavigateToStep3,
}: EventWizardStepperProps) {
  return (
    <section className="mb-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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
            onClick={() => onSelectStep(1)}
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
              className={`text-lg ${currentStep === 1 ? "text-gold" : "text-mist"}`}
            />
          </button>

          {/* Step 2 Button */}
          <button
            type="button"
            onClick={() => {
              if (canNavigateToStep2) onSelectStep(2);
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
              className={`text-lg ${currentStep === 2 ? "text-gold" : "text-mist"}`}
            />
          </button>

          {/* Step 3 Button */}
          <button
            type="button"
            onClick={() => {
              if (canNavigateToStep3) onSelectStep(3);
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
              className={`text-lg ${currentStep === 3 ? "text-gold" : "text-mist"}`}
            />
          </button>
        </div>
      </div>
    </section>
  );
}
