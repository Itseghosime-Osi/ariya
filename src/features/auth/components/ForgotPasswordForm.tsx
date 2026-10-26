"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { forgotPasswordAction } from "../actions";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [isDispatched, setIsDispatched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result = await forgotPasswordAction({ email });
      if (!result.ok) {
        setErrorMessage(result.error);
      } else {
        setIsDispatched(true);
      }
    });
  };

  if (isDispatched) {
    return (
      <section className="relative bg-paper rounded-xl p-8 lg:p-10 shadow-md flex flex-col justify-between overflow-hidden max-w-lg mx-auto w-full">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-secondary-fixed" />
        <div>
          {/* State Label */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <span className="font-label-sm text-label-sm uppercase tracking-wider px-3 py-1 rounded-full bg-secondary text-surface-container-lowest font-bold">
              State 02: Check Inbox
            </span>
            <span className="font-label-md text-label-md text-secondary font-semibold">
              Step 2 of 4
            </span>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm shrink-0">
              <Icon name="mark_email_unread" className="text-2xl text-wine" />
            </div>
            <div>
              <span className="font-label-sm text-label-sm uppercase text-secondary font-bold">
                Dispatch Complete
              </span>
              <h2 className="font-headline-md text-headline-md text-night">
                Check Your Inbox
              </h2>
            </div>
          </div>

          {/* Envelope Narrative Card */}
          <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm space-y-4 mb-6">
            <p className="font-body-md text-body-md text-paper-ink leading-relaxed">
              We&apos;ve dispatched a secure passcode reset link to{" "}
              <strong className="font-title-md text-wine font-semibold">
                {email}
              </strong>
              . The link remains valid for{" "}
              <span className="font-semibold text-night">60 minutes</span>.
            </p>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">
              <Icon name="info" className="text-lg text-secondary shrink-0" />
              <span>
                Spam filter alert: Check promotional tabs if not arrived in 2
                minutes.
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <button
              className="w-full py-3.5 px-6 rounded-lg bg-wine text-ivory font-title-md text-title-md flex items-center justify-center gap-2 shadow hover:bg-night hover:text-gold transition-all min-h-[44px]"
              type="button"
              onClick={() => setIsDispatched(false)}
            >
              <Icon name="forward_to_inbox" className="text-xl" />
              <span>Resend Email</span>
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsDispatched(false);
                  setEmail("");
                }}
                className="font-label-md text-label-md text-wine hover:text-primary transition-colors underline decoration-mist underline-offset-4"
              >
                Wrong email address? Change
              </button>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <div className="pt-8 mt-8 text-center border-t border-outline-variant/30">
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

  return (
    <section className="relative bg-paper rounded-xl p-8 lg:p-10 shadow-md flex flex-col justify-between overflow-hidden max-w-lg mx-auto w-full">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-wine via-primary to-wine" />
      <div>
        {/* State Label */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="font-label-sm text-label-sm uppercase tracking-wider px-3 py-1 rounded-full bg-wine text-ivory font-bold">
            State 01: Request Reset
          </span>
          <span className="font-label-md text-label-md text-secondary font-semibold">
            Step 1 of 4
          </span>
        </div>

        <div className="space-y-3 mb-8">
          <h2 className="font-headline-md text-headline-md text-night">
            Reset Your Passcode
          </h2>
          <p className="font-body-md text-body-md text-paper-ink">
            Enter your registered high-society organizer or family coordinator
            email. We will generate a one-time cryptographic reset token.
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

        {/* Interactive Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className="block font-label-md text-label-md uppercase tracking-wider text-wine mb-2 font-semibold"
              htmlFor="state1-email"
            >
              Registered Email Address
            </label>
            <div className="relative">
              <Icon
                name="mail"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-lg pointer-events-none"
                aria-hidden="true"
              />
              <input
                className="w-full pl-11 pr-4 py-3 bg-surface-container-lowest text-paper-ink rounded-lg font-body-md text-body-md shadow-inner focus:outline-none focus:bg-white"
                id="state1-email"
                placeholder="name@domain.ng"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
              Authorized dispatch domain: Owambe Planner Suite &amp; VIP
              Guestbook.
            </p>
          </div>

          <button
            className="w-full py-3.5 px-6 rounded-lg bg-gold text-night font-title-md text-title-md flex items-center justify-center gap-2 shadow hover:bg-secondary-fixed transition-all min-h-[44px] disabled:opacity-75"
            type="submit"
            disabled={isPending}
          >
            {isPending ? (
              <span>Dispatching reset link...</span>
            ) : (
              <>
                <span>Send Reset Link</span>
                <Icon name="arrow_forward" className="text-xl" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer Link */}
      <div className="pt-8 mt-8 text-center border-t border-outline-variant/30">
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
