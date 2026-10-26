"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { resetPasswordAction } from "../actions";

export function ResetPasswordForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      setErrorMessage("Passcodes do not match.");
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
    return (
      <section className="relative bg-paper rounded-xl p-8 lg:p-10 shadow-md flex flex-col justify-between overflow-hidden max-w-lg mx-auto w-full">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-success" />
        <div>
          {/* State Label */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <span className="font-label-sm text-label-sm uppercase tracking-wider px-3 py-1 rounded-full bg-success-surface text-success font-bold">
              State 04: Passcode Updated
            </span>
            <span className="font-label-md text-label-md text-success font-semibold">
              Complete
            </span>
          </div>

          <div className="flex flex-col items-center text-center py-6 px-4 bg-surface-container-lowest rounded-xl shadow-sm mb-6">
            <div className="w-20 h-20 rounded-full bg-success-surface text-success flex items-center justify-center mb-4 shadow">
              <Icon name="check_circle" className="text-4xl" />
            </div>
            <span className="font-label-md text-label-md uppercase tracking-widest text-success mb-1 font-bold">
              Identity Authenticated
            </span>
            <h2 className="font-headline-md text-headline-md text-night mb-2">
              Passcode Reset Successfully
            </h2>
            <p className="font-body-md text-body-md text-paper-ink max-w-md">
              Your passcode has been updated. Your Àríyá celebration workspace
              is now ready for high-table seating, Aṣọ-Ẹbí tracking, and banquet
              coordination.
            </p>
          </div>

          {/* Proceed Button */}
          <div className="space-y-4">
            <button
              className="w-full py-4 px-6 rounded-lg bg-gold text-night font-title-md text-title-md flex items-center justify-center gap-2 shadow-lg hover:bg-secondary-fixed transition-all min-h-[44px]"
              type="button"
              onClick={() => router.push("/events")}
            >
              <span>Proceed to Celebration Workspace</span>
              <Icon name="arrow_forward" className="text-xl" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative bg-paper rounded-xl p-8 lg:p-10 shadow-md flex flex-col justify-between overflow-hidden max-w-lg mx-auto w-full">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-wine" />
      <div>
        {/* State Label */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="font-label-sm text-label-sm uppercase tracking-wider px-3 py-1 rounded-full bg-tertiary-container text-on-tertiary-container font-bold">
            State 03: Set New Passcode
          </span>
          <span className="font-label-md text-label-md text-secondary font-semibold">
            Step 3 of 4
          </span>
        </div>

        <div className="space-y-2 mb-6">
          <h2 className="font-headline-md text-headline-md text-night">
            Create New Passcode
          </h2>
          <p className="font-body-md text-body-md text-paper-ink">
            Choose a distinguished, resilient passcode for your ceremonial
            registry and wedding database.
          </p>
        </div>

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

        {/* Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block font-label-md text-label-md uppercase tracking-wider text-wine mb-1.5 font-semibold"
              htmlFor="new-passcode"
            >
              New Passcode
            </label>
            <div className="relative">
              <input
                className="w-full px-4 pr-11 py-2.5 bg-surface-container-lowest text-paper-ink rounded-lg font-body-md text-body-md shadow-inner outline-none focus:bg-white"
                id="new-passcode"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isPending}
              />
              <button
                aria-label={showPassword ? "Hide passcode" : "Show passcode"}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-night min-h-[44px] min-w-[44px] justify-center"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                <Icon
                  name={showPassword ? "visibility_off" : "visibility"}
                  className="text-lg"
                />
              </button>
            </div>
          </div>

          <div>
            <label
              className="block font-label-md text-label-md uppercase tracking-wider text-wine mb-1.5 font-semibold"
              htmlFor="confirm-passcode"
            >
              Confirm New Passcode
            </label>
            <div className="relative">
              <input
                className="w-full px-4 pr-11 py-2.5 bg-surface-container-lowest text-paper-ink rounded-lg font-body-md text-body-md shadow-inner outline-none focus:bg-white"
                id="confirm-passcode"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isPending}
              />
              <button
                aria-label={
                  showConfirmPassword ? "Hide passcode" : "Show passcode"
                }
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-night min-h-[44px] min-w-[44px] justify-center"
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Icon
                  name={showConfirmPassword ? "visibility_off" : "visibility"}
                  className="text-lg"
                />
              </button>
            </div>
          </div>

          {/* Mismatch Alert Box */}
          {isMismatch && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-error-container text-on-error-container shadow-sm">
              <Icon name="error" className="text-xl flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-title-sm font-semibold">
                  Passcodes do not match
                </p>
                <p className="font-body-sm text-body-sm">
                  Please verify your entries. Passcodes must align identically.
                </p>
              </div>
            </div>
          )}

          {/* Standards Checklist */}
          <div className="p-4 bg-surface-container-lowest rounded-lg shadow-sm space-y-2">
            <p className="font-label-sm text-label-sm uppercase text-secondary font-bold">
              Registry Passcode Standards
            </p>
            <div className="grid grid-cols-2 gap-2 font-body-sm text-body-sm">
              <div
                className={`flex items-center gap-1.5 ${
                  hasMinLength ? "text-success font-semibold" : "text-mist"
                }`}
              >
                <Icon
                  name={hasMinLength ? "check_circle" : "circle"}
                  className="text-sm"
                />
                <span>8+ characters</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasUppercase ? "text-success font-semibold" : "text-mist"
                }`}
              >
                <Icon
                  name={hasUppercase ? "check_circle" : "circle"}
                  className="text-sm"
                />
                <span>1 uppercase letter</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasNumber ? "text-success font-semibold" : "text-mist"
                }`}
              >
                <Icon
                  name={hasNumber ? "check_circle" : "circle"}
                  className="text-sm"
                />
                <span>1 numeric digit</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasSpecial ? "text-success font-semibold" : "text-mist"
                }`}
              >
                <Icon
                  name={hasSpecial ? "check_circle" : "circle"}
                  className="text-sm"
                />
                <span>1 special symbol</span>
              </div>
            </div>
          </div>

          <button
            className="w-full py-3.5 px-6 rounded-lg bg-wine text-ivory font-title-md text-title-md flex items-center justify-center gap-2 shadow hover:bg-primary transition-all mt-4 min-h-[44px] disabled:opacity-75"
            type="submit"
            disabled={isPending || isMismatch}
          >
            {isPending ? (
              <span>Updating passcode...</span>
            ) : (
              <>
                <span>Update Passcode &amp; Continue</span>
                <Icon name="verified_user" className="text-xl" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="pt-8 mt-6 text-center border-t border-outline-variant/30">
        <Link
          className="inline-flex items-center gap-2 font-label-lg text-label-lg text-wine hover:text-primary transition-colors"
          href="/sign-in"
        >
          <Icon name="arrow_back" className="text-lg" />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </section>
  );
}
