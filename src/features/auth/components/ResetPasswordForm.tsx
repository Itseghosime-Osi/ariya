"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { resetPasswordAction } from "../actions";
import { ResetPasswordSuccess } from "./ResetPasswordSuccess";
import { PasswordField } from "./PasswordField";
import { AuthFeedbackAlert } from "./AuthFeedbackAlert";

export function ResetPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const result = await resetPasswordAction({
        password,
        confirmPassword,
      });

      if (!result.ok) {
        setErrorMessage(result.error);
      } else {
        setIsSuccess(true);
      }
    });
  };

  if (isSuccess) {
    return <ResetPasswordSuccess />;
  }

  return (
    <section className="relative bg-paper rounded-xl p-8 lg:p-10 shadow-md flex flex-col justify-between overflow-hidden max-w-lg mx-auto w-full">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-wine" />
      <div>
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="font-label-sm text-label-sm uppercase tracking-wider px-3 py-1 rounded-full bg-surface-container text-wine font-semibold">
            Step 2: Set New Password
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Step 2 of 2
          </span>
        </div>

        <div className="mb-6">
          <span className="font-label-md text-label-md uppercase tracking-widest text-secondary block mb-1 font-bold">
            PASSWORD RESET
          </span>
          <h1 className="font-display text-display text-wine tracking-tight">
            Set New Password
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            Choose a new password to protect your events, guest lists, and
            seating plans.
          </p>
        </div>

        <AuthFeedbackAlert error={errorMessage} />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <PasswordField
              id="new-password"
              label="New Password"
              value={password}
              onChange={setPassword}
              disabled={isPending}
              placeholder="••••••••••••"
              iconName="lock"
            />
            <PasswordField
              id="confirm-password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              disabled={isPending}
              placeholder="••••••••••••"
              iconName="lock_reset"
            />
          </div>

          {/* Validation Checklist */}
          <div className="bg-surface-container-low p-4 rounded-xl space-y-2 border border-surface-container-high/60">
            <span className="font-label-sm text-label-sm uppercase text-secondary font-bold block mb-1">
              Password Requirements:
            </span>
            <div className="grid grid-cols-2 gap-2 font-body-sm text-body-sm">
              <span
                className={`flex items-center gap-1.5 ${hasMinLength ? "text-success font-semibold" : "text-mist"}`}
              >
                <Icon
                  name={
                    hasMinLength ? "check_circle" : "radio_button_unchecked"
                  }
                  className="text-base"
                />
                8+ Characters
              </span>
              <span
                className={`flex items-center gap-1.5 ${hasUppercase ? "text-success font-semibold" : "text-mist"}`}
              >
                <Icon
                  name={
                    hasUppercase ? "check_circle" : "radio_button_unchecked"
                  }
                  className="text-base"
                />
                Uppercase Letter
              </span>
              <span
                className={`flex items-center gap-1.5 ${hasNumber ? "text-success font-semibold" : "text-mist"}`}
              >
                <Icon
                  name={hasNumber ? "check_circle" : "radio_button_unchecked"}
                  className="text-base"
                />
                One Number
              </span>
              <span
                className={`flex items-center gap-1.5 ${hasSpecial ? "text-success font-semibold" : "text-mist"}`}
              >
                <Icon
                  name={hasSpecial ? "check_circle" : "radio_button_unchecked"}
                  className="text-base"
                />
                Special Symbol
              </span>
            </div>
            {isMismatch && (
              <p className="font-body-sm text-body-sm text-error mt-2 flex items-center gap-1">
                <Icon name="error" className="text-sm" /> Passwords do not match
                yet.
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              className="w-full py-4 px-6 rounded-lg bg-wine hover:bg-night text-ivory font-title-md text-title-md shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 font-semibold disabled:opacity-60 min-h-[44px]"
              type="submit"
              disabled={isPending || !hasMinLength}
            >
              {isPending ? (
                <span>Updating Password...</span>
              ) : (
                <>
                  <span>Save New Password</span>
                  <Icon name="arrow_forward" className="text-xl text-gold" />
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/sign-in"
              className="font-label-md text-label-md text-secondary hover:text-wine font-semibold inline-flex items-center gap-1"
            >
              <Icon name="arrow_back" className="text-sm" />
              <span>Cancel &amp; Return to Sign In</span>
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
