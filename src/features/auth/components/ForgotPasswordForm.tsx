"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { forgotPasswordAction } from "../actions";
import { ForgotPasswordDispatched } from "./ForgotPasswordDispatched";
import { AuthFeedbackAlert } from "./AuthFeedbackAlert";

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
      <ForgotPasswordDispatched
        email={email}
        onResend={() => {
          setIsDispatched(false);
        }}
        onChangeEmail={() => {
          setIsDispatched(false);
          setEmail("");
        }}
      />
    );
  }

  return (
    <section className="w-full">
      <div>
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="rounded-full bg-[#eee5d9] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-wine">
            Account Recovery
          </span>
          <span className="text-xs text-label-2">Step 1 of 2</span>
        </div>

        <div className="mb-6">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-gold-ink">
            PASSWORD RECOVERY
          </span>
          <h1 className="font-display text-4xl font-semibold leading-tight text-wine sm:text-5xl">
            Forgot Password?
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-label-2">
            Enter the email address registered with your account to receive
            password reset instructions.
          </p>
        </div>

        <AuthFeedbackAlert error={errorMessage} />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label
              className="font-label-md text-label-md uppercase tracking-wider text-wine font-semibold"
              htmlFor="reset-email"
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
                className="w-full rounded-xl border border-outline-variant/60 bg-paper py-3 pl-11 pr-4 text-sm text-night shadow-inner outline-none transition-all placeholder:text-mist focus:border-gold focus:bg-surface-container-lowest focus:ring-4 focus:ring-gold/15"
                id="reset-email"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <span className="font-body-sm text-body-sm text-mist block pt-0.5">
              Must match the email used on your account.
            </span>
          </div>

          <button
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-wine px-6 py-3.5 text-sm font-semibold text-ivory shadow-[0_8px_24px_-12px_rgba(74,17,29,0.8)] transition-all hover:-translate-y-0.5 hover:bg-burgundy hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:opacity-60"
            type="submit"
            disabled={isPending}
          >
            {isPending ? (
              <span>Sending Reset Link...</span>
            ) : (
              <>
                <span>Send Reset Link</span>
                <Icon name="outgoing_mail" className="text-xl text-gold" />
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              href="/sign-in"
              className="font-label-md text-label-md text-secondary hover:text-wine font-semibold inline-flex items-center gap-1"
            >
              <Icon name="arrow_back" className="text-sm" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
