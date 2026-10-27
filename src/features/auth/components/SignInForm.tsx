"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { signInAction } from "../actions";
import { PasswordField } from "./PasswordField";
import { AuthFeedbackAlert } from "./AuthFeedbackAlert";

export function SignInForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

      <AuthFeedbackAlert error={errorMessage} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label
              className="font-label-md text-label-md uppercase tracking-wider text-night font-semibold"
              htmlFor="signin-email"
            >
              Planner Email
            </label>
            <span className="font-body-sm text-body-sm text-outline">
              WAT Lagos
            </span>
          </div>
          <div className="relative">
            <Icon
              name="mail"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-outline pointer-events-none"
              aria-hidden="true"
            />
            <input
              className="w-full bg-paper text-night font-body-md text-body-md pl-11 pr-4 py-3 rounded-xl shadow-inner outline-none transition-all placeholder:text-mist focus:bg-surface-container-lowest"
              id="signin-email"
              placeholder="curator@celebrations.ng"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending}
            />
          </div>
        </div>

        <PasswordField
          id="signin-password"
          label="Passcode"
          value={password}
          onChange={setPassword}
          disabled={isPending}
          placeholder="••••••••••••"
          iconName="lock"
        />

        <div className="flex items-center justify-between text-body-sm font-body-sm pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded text-primary accent-wine w-4 h-4"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isPending}
            />
            <span className="text-on-surface-variant">Remember device</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-primary hover:text-wine font-label-md font-semibold hover:underline"
          >
            Forgot passcode?
          </Link>
        </div>

        <button
          className="w-full py-4 px-6 rounded-xl bg-wine hover:bg-night text-ivory font-title-md text-title-md font-semibold tracking-wide flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-75 disabled:cursor-not-allowed min-h-[44px]"
          type="submit"
          disabled={isPending}
        >
          {isPending ? (
            <span>Signing in...</span>
          ) : (
            <>
              <span>Sign In</span>
              <Icon name="arrow_forward" className="text-xl text-gold" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
