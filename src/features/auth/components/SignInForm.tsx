"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { signInAction } from "../actions";
import { PasswordField } from "./PasswordField";
import { AuthFeedbackAlert } from "./AuthFeedbackAlert";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const welcomed = useRef(false);

  useEffect(() => {
    if (searchParams?.get("welcome") !== "1" || welcomed.current) return;
    welcomed.current = true;
    setWelcomeMessage(
      "Your account is ready. Check your email to verify your address before signing in."
    );
    void import("@/lib/fireworks").then(({ startFireworks }) => {
      startFireworks({
        scale: "finale",
        kicker: "Welcome to Àríyá",
        caption: "A new celebration begins.",
      });
    });

    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    window.history.replaceState(
      null,
      "",
      url.pathname + (url.search ? url.search : "") + url.hash
    );
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const nextParam = searchParams?.get("next") ?? undefined;

    startTransition(async () => {
      const result = await signInAction({
        email,
        password,
        rememberMe,
        next: nextParam,
      });

      if (!result.ok) {
        setErrorMessage(result.error);
      } else {
        router.push(result.redirectTo ?? "/events");
        router.refresh();
      }
    });
  };

  return (
    <div className="w-full">
      <div className="flex flex-col">
        <div className="mb-7">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
            Welcome back
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight text-wine sm:text-5xl">
            Your celebration desk awaits.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-label-2">
            Sign in to pick up where you left off with guests, seating, and
            every detail in between.
          </p>
        </div>

        <AuthFeedbackAlert error={errorMessage} success={welcomeMessage} />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label
                className="font-label-md text-label-md uppercase tracking-wider text-night font-semibold"
                htmlFor="signin-email"
              >
                Email Address
              </label>
            </div>
            <div className="relative">
              <Icon
                name="mail"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-outline pointer-events-none"
                aria-hidden="true"
              />
              <input
                className="w-full rounded-xl border border-outline-variant/60 bg-paper py-3 pl-11 pr-4 text-sm text-night shadow-inner outline-none transition-all placeholder:text-mist focus:border-gold focus:bg-surface-container-lowest focus:ring-4 focus:ring-gold/15"
                id="signin-email"
                placeholder="you@example.com"
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
            label="Password"
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
              Forgot password?
            </Link>
          </div>

          <button
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-wine px-6 py-3.5 text-sm font-semibold tracking-wide text-ivory shadow-[0_8px_24px_-12px_rgba(74,17,29,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-burgundy hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:cursor-not-allowed disabled:opacity-75"
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

        <p className="mt-6 text-center text-sm text-label-2">
          New to Àríyá?{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-wine underline decoration-gold/60 underline-offset-4 hover:text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
