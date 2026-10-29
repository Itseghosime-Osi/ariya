"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

interface ForgotPasswordDispatchedProps {
  email: string;
  onResend: () => void;
  onChangeEmail: () => void;
}

export function ForgotPasswordDispatched({
  email,
  onResend,
  onChangeEmail,
}: ForgotPasswordDispatchedProps) {
  return (
    <section className="relative bg-paper rounded-xl p-8 lg:p-10 shadow-md flex flex-col justify-between overflow-hidden max-w-lg mx-auto w-full">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-secondary-fixed" />
      <div>
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="font-label-sm text-label-sm uppercase tracking-wider px-3 py-1 rounded-full bg-secondary text-surface-container-lowest font-bold">
            Check Your Email
          </span>
          <span className="font-label-md text-label-md text-secondary font-semibold">
            Step 2 of 2
          </span>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm shrink-0">
            <Icon name="mail" className="text-2xl text-wine" />
          </div>
          <div>
            <span className="font-label-sm text-label-sm uppercase text-secondary font-bold">
              Email Sent
            </span>
            <h2 className="font-headline-md text-headline-md text-night">
              Check Your Inbox
            </h2>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm space-y-4 mb-6">
          <p className="font-body-md text-body-md text-paper-ink leading-relaxed">
            We&apos;ve sent a secure password reset link to{" "}
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

        <div className="space-y-4">
          <button
            className="w-full py-3.5 px-6 rounded-lg bg-wine text-ivory font-title-md text-title-md flex items-center justify-center gap-2 shadow hover:bg-night hover:text-gold transition-all min-h-[44px]"
            type="button"
            onClick={onResend}
          >
            <Icon name="outgoing_mail" className="text-xl" />
            <span>Resend Email</span>
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={onChangeEmail}
              className="font-label-md text-label-md text-wine hover:text-primary transition-colors underline decoration-mist underline-offset-4"
            >
              Wrong email address? Change
            </button>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-surface-container-high/60 mt-6 text-center">
        <Link
          href="/sign-in"
          className="font-label-md text-label-md text-secondary hover:text-wine font-semibold inline-flex items-center gap-1"
        >
          <Icon name="arrow_back" className="text-sm" />
          <span>Return to Sign In</span>
        </Link>
      </div>
    </section>
  );
}
