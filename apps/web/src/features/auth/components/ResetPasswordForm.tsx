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
    <section className="w-full">
      <div>
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="rounded-full bg-[#eee5d9] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-wine">
            Step 2: Set New Password
          </span>
          <span className="text-xs text-label-2">Step 2 of 2</span>
        </div>

        <div className="mb-6">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-gold-ink">
            PASSWORD RESET
          </span>
          <h1 className="font-display text-4xl font-semibold leading-tight text-wine sm:text-5xl">
            Set New Password
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-label-2">
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
              iconName="lock"
            />
          </div>

          {/* Validation Checklist */}
          <div className="space-y-3 border-y border-gold/30 py-4">
            <span className="font-label-sm text-label-sm uppercase text-secondary font-bold block mb-1">
              Password Requirements:
            </span>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <span
                className={`flex items-center gap-1.5 ${hasMinLength ? "text-success font-semibold" : "text-mist"}`}
              >
                <Icon
                  name={hasMinLength ? "check_circle" : "pending"}
                  className="text-base"
                />
                8+ Characters
              </span>
              <span
                className={`flex items-center gap-1.5 ${hasUppercase ? "text-success font-semibold" : "text-mist"}`}
              >
                <Icon
                  name={hasUppercase ? "check_circle" : "pending"}
                  className="text-base"
                />
                Uppercase Letter
              </span>
              <span
                className={`flex items-center gap-1.5 ${hasNumber ? "text-success font-semibold" : "text-mist"}`}
              >
                <Icon
                  name={hasNumber ? "check_circle" : "pending"}
                  className="text-base"
                />
                One Number
              </span>
              <span
                className={`flex items-center gap-1.5 ${hasSpecial ? "text-success font-semibold" : "text-mist"}`}
              >
                <Icon
                  name={hasSpecial ? "check_circle" : "pending"}
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
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-wine px-6 py-3.5 text-sm font-semibold text-ivory shadow-[0_8px_24px_-12px_rgba(74,17,29,0.8)] transition-all hover:-translate-y-0.5 hover:bg-burgundy hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:opacity-60"
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
