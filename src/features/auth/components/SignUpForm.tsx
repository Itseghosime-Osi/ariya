"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { signUpAction } from "../actions";

export function SignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<"couple" | "planner">("couple");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password strength calculation
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const score =
    (hasMinLength ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0);

  const getStrengthLabel = () => {
    if (!password) return "Enter passcode";
    if (score === 3) return "Strong Passcode";
    if (score >= 1) return "Moderate Passcode";
    return "Weak Passcode";
  };

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
      } else {
        setSuccessMessage(
          "Account created! Please check your email to verify your registration, or sign in."
        );
        setTimeout(() => {
          router.push("/sign-in");
        }, 2000);
      }
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col my-8">
      {/* Header */}
      <div className="mb-8">
        <span className="font-label-md text-label-md text-secondary uppercase tracking-widest block mb-2 font-bold">
          Step 01 / Registration Dossier
        </span>
        <h1 className="font-display text-display text-wine tracking-tight leading-tight">
          Create Your Account
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-md">
          Enter the ceremonial suite to orchestrate high-profile banqueting,
          Aṣọ-Ẹbí distributions, and sovereign seating charts.
        </p>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div
          className="rounded-xl p-4 bg-success-surface border border-success/30 flex items-start space-x-3 mb-6 shadow-sm"
          role="status"
        >
          <Icon
            name="check_circle"
            className="text-success text-xl shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-0.5">
            <h4 className="font-label-md text-label-md text-success font-semibold">
              Registration Successful
            </h4>
            <p className="font-body-sm text-body-sm text-paper-ink">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
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
          <div className="space-y-0.5">
            <h4 className="font-label-md text-label-md text-on-error-container font-semibold">
              Action Required
            </h4>
            <p className="font-body-sm text-body-sm text-on-error-container leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Intent Selector */}
        <div className="flex flex-col gap-2">
          <label className="font-label-md text-label-md uppercase tracking-wider text-wine font-semibold">
            I Am Registering As
          </label>
          <div className="grid grid-cols-1 gap-3">
            {/* Couple Option */}
            <button
              type="button"
              onClick={() => setRole("couple")}
              className={`text-left flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                role === "couple"
                  ? "bg-paper shadow-sm ring-1 ring-gold"
                  : "bg-surface-container hover:bg-paper"
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                  role === "couple" ? "bg-wine text-ivory" : "bg-surface-dim"
                }`}
              >
                {role === "couple" && (
                  <div className="w-2 h-2 rounded-full bg-gold" />
                )}
              </div>
              <div className="flex flex-col pr-2">
                <span className="font-title-md text-title-md text-night font-semibold">
                  Bride, Groom or Couple
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Planning our celebration with family registers and curated
                  tables
                </span>
              </div>
            </button>

            {/* Planner Option */}
            <button
              type="button"
              onClick={() => setRole("planner")}
              className={`text-left flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                role === "planner"
                  ? "bg-paper shadow-sm ring-1 ring-gold"
                  : "bg-surface-container hover:bg-paper"
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                  role === "planner" ? "bg-wine text-ivory" : "bg-surface-dim"
                }`}
              >
                {role === "planner" && (
                  <div className="w-2 h-2 rounded-full bg-gold" />
                )}
              </div>
              <div className="flex flex-col pr-2">
                <span className="font-title-md text-title-md text-night font-semibold">
                  Professional Event Planner
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Managing luxury banquets and milestone itineraries across
                  multiple client registries
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Full Legal Name */}
        <div className="flex flex-col gap-1.5">
          <label
            className="font-label-md text-label-md uppercase tracking-wider text-wine font-semibold"
            htmlFor="fullName"
          >
            Full Legal Name
          </label>
          <div className="relative">
            <Icon
              name="badge"
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

        {/* Primary Contact Email */}
        <div className="flex flex-col gap-1.5">
          <label
            className="font-label-md text-label-md uppercase tracking-wider text-wine font-semibold"
            htmlFor="emailInput"
          >
            Primary Contact Email
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
              placeholder="dossier@domain.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending}
            />
          </div>
        </div>

        {/* Passcode Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              className="font-label-md text-label-md uppercase tracking-wider text-wine font-semibold"
              htmlFor="password"
            >
              Passcode
            </label>
            <div className="relative">
              <Icon
                name="lock"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-outline pointer-events-none"
                aria-hidden="true"
              />
              <input
                className="w-full bg-paper text-night font-body-md text-body-md pl-11 pr-11 py-3 rounded-xl shadow-inner outline-none transition-all focus:bg-surface-container-lowest"
                id="password"
                placeholder="••••••••••••"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isPending}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-wine min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide passcode" : "Show passcode"}
              >
                <Icon
                  name={showPassword ? "visibility_off" : "visibility"}
                  className="text-lg"
                />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="font-label-md text-label-md uppercase tracking-wider text-wine font-semibold"
              htmlFor="confirmPassword"
            >
              Confirm Passcode
            </label>
            <div className="relative">
              <Icon
                name="verified_user"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-outline pointer-events-none"
                aria-hidden="true"
              />
              <input
                className="w-full bg-paper text-night font-body-md text-body-md pl-11 pr-11 py-3 rounded-xl shadow-inner outline-none transition-all focus:bg-surface-container-lowest"
                id="confirmPassword"
                placeholder="••••••••••••"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isPending}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-wine min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={
                  showConfirmPassword ? "Hide passcode" : "Show passcode"
                }
              >
                <Icon
                  name={showConfirmPassword ? "visibility_off" : "visibility"}
                  className="text-lg"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Strength Meter */}
        <div className="p-4 rounded-xl bg-surface-container flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
              Credential Strength
            </span>
            <span
              className={`font-label-sm text-label-sm font-bold ${
                score === 3
                  ? "text-success"
                  : score >= 1
                    ? "text-secondary"
                    : "text-error"
              }`}
            >
              {getStrengthLabel()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                score >= 1 ? "bg-success" : "bg-mist/30"
              }`}
            />
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                score >= 2 ? "bg-success" : "bg-mist/30"
              }`}
            />
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                score >= 3 ? "bg-success" : "bg-mist/30"
              }`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-body-sm text-body-sm">
            <div
              className={`flex items-center gap-1.5 ${
                hasMinLength ? "text-success font-semibold" : "text-mist"
              }`}
            >
              <Icon
                name={hasMinLength ? "check_circle" : "circle"}
                className="text-sm"
              />
              <span>8+ Characters</span>
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
              <span>1+ Number</span>
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
              <span>1+ Special symbol</span>
            </div>
          </div>
        </div>

        {/* Consent Checkbox */}
        <label className="flex items-start gap-3 p-3.5 rounded-xl bg-paper cursor-pointer select-none">
          <input
            className="mt-1 rounded text-wine accent-wine w-4 h-4 cursor-pointer"
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            disabled={isPending}
          />
          <span className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            I agree to the Terms of Service and Privacy Policy governing
            sensitive matrimonial protocols, family registries, and celebration
            data handling.
          </span>
        </label>

        {/* Submit Button */}
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

        {/* Sign In Link */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="font-body-md text-body-md text-on-surface-variant">
            Already possess a registry account?
          </span>
          <Link
            className="font-title-md text-title-md text-wine font-bold hover:text-primary hover:underline transition-colors flex items-center gap-1"
            href="/sign-in"
          >
            <span>Sign In</span>
            <Icon name="arrow_outward" className="text-sm" />
          </Link>
        </div>
      </form>
    </div>
  );
}
