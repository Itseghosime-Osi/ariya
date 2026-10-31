"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { signUpAction } from "../actions";
import { RoleSelector } from "./RoleSelector";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { PasswordField } from "./PasswordField";
import { AuthFeedbackAlert } from "./AuthFeedbackAlert";
import { SignUpTermsCheckbox } from "./SignUpTermsCheckbox";
import { celebrateStep } from "@/features/events/components/desk/celebrate";
import { enableFireworkAudioOnInteraction } from "@/lib/firework-audio";

const STEPS = [
  {
    label: "Your details",
    eyebrow: "First, who's hosting?",
    title: "Let's start with you.",
    description: "Tell us who's bringing everyone together.",
  },
  {
    label: "Your email",
    eyebrow: "Stay in the loop",
    title: "Where can we reach you?",
    description:
      "We'll use this address for your account and celebration updates.",
  },
  {
    label: "Your passcode",
    eyebrow: "One last detail",
    title: "Keep your plans yours.",
    description: "Choose a secure passcode for your celebration desk.",
  },
] as const;

const STEP_CELEBRATIONS = [
  "Lovely. Your host details are in.",
  "A beautiful start. Your account is almost ready.",
] as const;

export function SignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"couple" | "planner">("couple");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stepMessage, setStepMessage] = useState<string | null>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (step > 1) stepHeading.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!stepMessage) return;
    const timeout = window.setTimeout(() => setStepMessage(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [stepMessage]);

  useEffect(() => enableFireworkAudioOnInteraction(), []);

  const advanceStep = () => {
    if (step === 1 && fullName.trim().length < 2) {
      setErrorMessage("Please enter your name to continue.");
      return;
    }

    if (step === 2) {
      const emailField =
        document.querySelector<HTMLInputElement>("#emailInput");
      if (!email.trim() || !emailField?.validity.valid) {
        setErrorMessage("Please enter a valid email address to continue.");
        return;
      }
    }

    setErrorMessage(null);
    setStepMessage(STEP_CELEBRATIONS[step - 1]);
    const bounds = continueButton.current?.getBoundingClientRect();
    void celebrateStep(
      bounds
        ? {
            x: (bounds.left + bounds.width / 2) / window.innerWidth,
            y: (bounds.top + bounds.height / 2) / window.innerHeight,
          }
        : undefined
    );
    setStep(step + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (step < STEPS.length) {
      advanceStep();
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passcodes do not match.");
      return;
    }

    if (!agreeTerms) {
      setErrorMessage("Please accept the terms and privacy policy.");
      return;
    }

    startTransition(async () => {
      const result = await signUpAction({
        fullName,
        email,
        role,
        password,
        confirmPassword,
        agreeTerms: true,
      });

      if (!result.ok) {
        setErrorMessage(result.error);
      } else if (result.data?.hasSession) {
        router.push("/events?welcome=1");
        router.refresh();
      } else {
        router.push("/sign-in?welcome=1");
        router.refresh();
      }
    });
  };

  const stepInfo = STEPS[step - 1];

  return (
    <div className="w-full">
      <header className="mb-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
          Create your host account
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-wine sm:text-5xl">
          Let the celebration begin.
        </h1>
      </header>

      <nav aria-label="Account setup progress" className="mb-6">
        <ol className="flex items-start">
          {STEPS.map((item, index) => {
            const stepNumber = index + 1;
            const isCurrent = step === stepNumber;
            const isComplete = step > stepNumber;
            return (
              <li
                key={item.label}
                className={`flex items-start ${
                  index < STEPS.length - 1 ? "flex-1" : "shrink-0"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-current={isCurrent ? "step" : undefined}
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors motion-reduce:transition-none ${
                      isCurrent
                        ? "border-wine bg-wine text-ivory"
                        : isComplete
                          ? "border-gold bg-gold/15 text-gold-ink"
                          : "border-outline-variant text-label-2"
                    }`}
                  >
                    {isComplete ? <Icon name="check" size={15} /> : stepNumber}
                  </span>
                  <span
                    className={`hidden text-xs sm:inline ${
                      isCurrent ? "font-semibold text-wine" : "text-label-2"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`mx-2 mt-4 h-px flex-1 ${
                      isComplete ? "bg-gold" : "bg-outline-variant"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <section aria-label={`Step ${step} of ${STEPS.length}`}>
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-ink">
            {stepInfo.eyebrow}
          </p>
          <h2
            ref={stepHeading}
            tabIndex={-1}
            className="mt-1 font-display text-2xl font-semibold leading-tight text-wine focus:outline-none sm:text-3xl"
          >
            {stepInfo.title}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-label-2">
            {stepInfo.description}
          </p>
        </div>

        {stepMessage && (
          <p
            className="mb-4 flex items-center gap-2 text-sm font-medium text-gold-ink"
            role="status"
          >
            <Icon name="celebration" size={17} />
            {stepMessage}
          </p>
        )}

        <AuthFeedbackAlert error={errorMessage} />

        <form onSubmit={handleSubmit} className="space-y-5">
          {step === 1 && (
            <div className="space-y-5">
              <RoleSelector
                role={role}
                onChange={setRole}
                disabled={isPending}
              />
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-[0.16em] text-wine"
                  htmlFor="fullName"
                >
                  Full name
                </label>
                <div className="relative">
                  <Icon
                    name="verified"
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-outline"
                    aria-hidden="true"
                  />
                  <input
                    className="w-full rounded-xl border border-outline-variant/60 bg-paper py-3 pl-11 pr-4 text-sm text-night shadow-inner outline-none transition-all placeholder:text-mist focus:border-gold focus:bg-surface-container-lowest focus:ring-4 focus:ring-gold/15"
                    id="fullName"
                    placeholder="First & Last Name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    minLength={2}
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-1.5">
              <label
                className="text-[11px] font-semibold uppercase tracking-[0.16em] text-wine"
                htmlFor="emailInput"
              >
                Email address
              </label>
              <div className="relative">
                <Icon
                  name="mail"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-outline"
                  aria-hidden="true"
                />
                <input
                  className="w-full rounded-xl border border-outline-variant/60 bg-paper py-3 pl-11 pr-4 text-sm text-night shadow-inner outline-none transition-all placeholder:text-mist focus:border-gold focus:bg-surface-container-lowest focus:ring-4 focus:ring-gold/15"
                  id="emailInput"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <p className="text-xs text-label-2">
                Use an address you can check for your verification link.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <PasswordField
                  id="password"
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  disabled={isPending}
                  iconName="lock"
                />
                <PasswordField
                  id="confirmPassword"
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  disabled={isPending}
                  iconName="shield"
                />
              </div>

              <PasswordStrengthMeter password={password} />

              <SignUpTermsCheckbox
                checked={agreeTerms}
                onChange={setAgreeTerms}
                disabled={isPending}
              />
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            {step > 1 && (
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-wine transition-colors hover:bg-wine/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setStepMessage(null);
                  setStep(step - 1);
                }}
                disabled={isPending}
              >
                <Icon name="arrow_back" size={17} />
                Back
              </button>
            )}

            <button
              ref={step < STEPS.length ? continueButton : undefined}
              className="flex min-h-12 flex-1 items-center justify-center gap-3 rounded-full bg-wine px-6 py-3.5 text-sm font-semibold tracking-wide text-ivory shadow-[0_8px_24px_-12px_rgba(74,17,29,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-burgundy hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:cursor-not-allowed disabled:opacity-75 motion-reduce:transition-none"
              type="submit"
              data-testid={
                step < STEPS.length ? "signup-continue" : "signup-submit"
              }
              disabled={isPending}
            >
              {step < STEPS.length ? (
                <>
                  <span>
                    {step === 1 ? "Continue to email" : "Continue to passcode"}
                  </span>
                  <Icon name="arrow_forward" className="text-xl text-gold" />
                </>
              ) : isPending ? (
                <span>Creating celebration account...</span>
              ) : (
                <>
                  <span>Create Celebration Account</span>
                  <Icon name="arrow_forward" className="text-xl text-gold" />
                </>
              )}
            </button>
          </div>
        </form>

        <p className="mt-5 text-center text-sm text-label-2">
          Already have an account?{" "}
          <Link
            className="font-semibold text-wine underline decoration-gold/60 underline-offset-4 hover:text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            href="/sign-in"
          >
            Sign in
          </Link>
        </p>
      </section>
    </div>
  );
}
