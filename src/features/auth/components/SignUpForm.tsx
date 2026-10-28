"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { signUpAction } from "../actions";
import { RoleSelector } from "./RoleSelector";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { PasswordField } from "./PasswordField";
import { AuthFeedbackAlert } from "./AuthFeedbackAlert";
import { SignUpTermsCheckbox } from "./SignUpTermsCheckbox";

export function SignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<"couple" | "planner">("couple");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

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
        router.push("/events");
        router.refresh();
      } else {
        setSuccessMessage(
          "Account created! Please check your email to verify your registration, or sign in."
        );
        router.push("/sign-in");
        router.refresh();
      }
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col my-8">
      <div className="mb-8">
        <span className="font-label-md text-label-md text-secondary uppercase tracking-widest block mb-2 font-bold">
          Account Details
        </span>
        <h1 className="font-display text-display text-wine tracking-tight leading-tight">
          Create Your Account
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-md">
          Create an account to manage your celebrations, send personal RSVP
          links, arrange table seating, and check in guests.
        </p>
      </div>

      <AuthFeedbackAlert error={errorMessage} success={successMessage} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <RoleSelector role={role} onChange={setRole} disabled={isPending} />

        <div className="flex flex-col gap-1.5">
          <label
            className="font-label-md text-label-md uppercase tracking-wider text-wine font-semibold"
            htmlFor="fullName"
          >
            Full Name
          </label>
          <div className="relative">
            <Icon
              name="verified"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-outline pointer-events-none"
              aria-hidden="true"
            />
            <input
              className="w-full bg-paper text-night font-body-md text-body-md pl-11 pr-4 py-3 rounded-xl shadow-inner outline-none transition-all placeholder:text-mist focus:bg-surface-container-lowest"
              id="fullName"
              placeholder="First & Last Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={isPending}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            className="font-label-md text-label-md uppercase tracking-wider text-wine font-semibold"
            htmlFor="emailInput"
          >
            Email Address
          </label>
          <div className="relative">
            <Icon
              name="mail"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-outline pointer-events-none"
              aria-hidden="true"
            />
            <input
              className="w-full bg-paper text-night font-body-md text-body-md pl-11 pr-4 py-3 rounded-xl shadow-inner outline-none transition-all placeholder:text-mist focus:bg-surface-container-lowest"
              id="emailInput"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="pt-2">
          <button
            className="w-full py-4 px-6 rounded-xl bg-wine hover:bg-primary text-ivory font-title-md text-title-md font-semibold tracking-wide flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-75 disabled:cursor-not-allowed min-h-[44px]"
            type="submit"
            disabled={isPending}
          >
            {isPending ? (
              <span>Creating celebration account...</span>
            ) : (
              <>
                <span>Create Celebration Account</span>
                <Icon name="arrow_forward" className="text-xl text-gold" />
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="font-body-md text-body-md text-on-surface-variant">
            Already have an account?
          </span>
          <Link
            className="font-title-md text-title-md text-wine font-bold hover:text-primary hover:underline transition-colors flex items-center gap-1"
            href="/sign-in"
          >
            <span>Sign In</span>
            <Icon name="arrow_forward" className="text-sm" />
          </Link>
        </div>
      </form>
    </div>
  );
}
