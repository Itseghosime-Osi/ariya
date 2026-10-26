"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { signInAction } from "../actions";

export function SignInForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result = await signInAction({
        email,
        password,
        rememberMe,
      });

      if (!result.ok) {
        setErrorMessage(result.error);
      } else {
        router.push("/events");
        router.refresh();
      }
    });
  };

  return (
    <div className="my-10 w-full max-w-md mx-auto lg:mx-0 flex flex-col space-y-7">
      {/* Header Text */}
      <div className="space-y-2">
        <h1 className="font-headline-lg text-headline-lg text-night">
          Welcome Back
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Enter your credentials to access your banquet registers, guest
          rosters, and Aṣọ-Ẹbí distribution rosters.
        </p>
      </div>

      {/* Mode Toggle Tabs */}
      <div className="flex p-1 bg-surface-container rounded-xl">
        <button
          className="flex-1 py-2.5 rounded-lg bg-surface-container-lowest text-primary font-label-md text-label-md shadow-sm transition-all duration-150"
          type="button"
        >
          Sign In
        </button>
        <Link
          href="/sign-up"
          className="flex-1 py-2.5 rounded-lg text-on-surface-variant font-label-md text-label-md hover:text-night transition-colors text-center"
        >
          Create Account
        </Link>
      </div>

      {/* Inline Credential Error State Banner */}
      {errorMessage && (
        <div
          className="rounded-xl p-4 bg-error-container/70 flex items-start space-x-3 shadow-sm"
          role="alert"
        >
          <Icon
            name="error"
            className="text-error text-xl shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-0.5">
            <h4 className="font-label-md text-label-md text-on-error-container font-semibold">
              Authentication Notice
            </h4>
            <p className="font-body-sm text-body-sm text-on-error-container leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Sign In Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Input */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label
              className="font-label-md text-label-md uppercase tracking-wider text-night font-semibold"
              htmlFor="signin-email"
            >
              Planner Email
            </label>
            <span className="font-body-sm text-body-sm text-outline">
              Registered address
            </span>
          </div>
          <div className="relative">
            <Icon
              name="mail"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-lg pointer-events-none"
              aria-hidden="true"
            />
            <input
              className="w-full bg-paper pl-11 pr-4 py-3 rounded-xl font-body-md text-body-md text-paper-ink shadow-inner placeholder-outline focus:outline-none focus:bg-surface-container-lowest transition-all"
              id="signin-email"
              placeholder="planner@ariya.ng"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending}
            />
          </div>
        </div>

        {/* Passcode Input with Visibility Toggle */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label
              className="font-label-md text-label-md uppercase tracking-wider text-night font-semibold"
              htmlFor="signin-passcode"
            >
              Passcode
            </label>
            <Link
              className="font-body-sm text-body-sm text-wine hover:underline"
              href="/forgot-password"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Icon
              name="lock"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-lg pointer-events-none"
              aria-hidden="true"
            />
            <input
              className="w-full bg-paper pl-11 pr-12 py-3 rounded-xl font-body-md text-body-md text-paper-ink shadow-inner placeholder-outline focus:outline-none focus:bg-surface-container-lowest transition-all"
              id="signin-passcode"
              placeholder="••••••••••••"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isPending}
            />
            <button
              aria-label={showPassword ? "Hide passcode" : "Show passcode"}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-outline hover:text-wine rounded-lg transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
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

        {/* Remember Device */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center space-x-2.5 cursor-pointer select-none">
            <input
              className="w-4 h-4 rounded text-wine accent-wine cursor-pointer"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isPending}
            />
            <span className="font-body-sm text-body-sm text-paper-ink">
              Remember this device for 30 days
            </span>
          </label>
        </div>

        {/* Primary Active Action Button */}
        <button
          className="w-full py-3.5 px-6 rounded-xl bg-wine text-ivory font-label-lg text-label-lg shadow-md hover:bg-night hover:text-gold transition-all duration-200 flex items-center justify-center space-x-2 group disabled:opacity-75 disabled:cursor-not-allowed min-h-[44px]"
          type="submit"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-gold shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  fill="currentColor"
                />
              </svg>
              <span>Authenticating planner credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In to Celebration Hub</span>
              <Icon
                name="arrow_forward"
                className="text-lg transition-transform group-hover:translate-x-1"
              />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
