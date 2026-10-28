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
    <section className="relative bg-paper rounded-xl p-8 lg:p-10 shadow-md flex flex-col justify-between overflow-hidden max-w-lg mx-auto w-full">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-wine" />
      <div>
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="font-label-sm text-label-sm uppercase tracking-wider px-3 py-1 rounded-full bg-surface-container text-wine font-semibold">
            Account Recovery
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Step 1 of 2
          </span>
        </div>

        <div className="mb-6">
          <span className="font-label-md text-label-md uppercase tracking-widest text-secondary block mb-1 font-bold">
            PASSWORD RECOVERY
          </span>
          <h1 className="font-display text-display text-wine tracking-tight">
            Forgot Password?
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
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
                className="w-full bg-paper text-night font-body-md text-body-md pl-11 pr-4 py-3 rounded-xl shadow-inner outline-none transition-all placeholder:text-mist focus:bg-surface-container-lowest"
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
            className="w-full py-4 px-6 rounded-lg bg-wine hover:bg-night text-ivory font-title-md text-title-md shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 font-semibold disabled:opacity-60 min-h-[44px]"
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
