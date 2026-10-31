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
    <section className="w-full">
      <div>
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="rounded-full bg-secondary text-surface-container-lowest px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
            Check Your Email
          </span>
          <span className="text-xs font-semibold text-secondary">
            Step 2 of 2
          </span>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container shadow-sm">
            <Icon name="mail" className="text-2xl text-wine" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
              Email Sent
            </span>
            <h2 className="font-display text-2xl font-semibold text-night">
              Check Your Inbox
            </h2>
          </div>
        </div>

        <div className="mb-6 space-y-4 border-y border-gold/30 py-5">
          <p className="font-body-md text-body-md text-paper-ink leading-relaxed">
            We&apos;ve sent a secure password reset link to{" "}
            <strong className="font-title-md text-wine font-semibold">
              {email}
            </strong>
            . The link remains valid for{" "}
            <span className="font-semibold text-night">60 minutes</span>.
          </p>
          <div className="flex items-start gap-3 border-l-2 border-gold pl-3 text-sm text-label-2">
            <Icon name="info" className="text-lg text-secondary shrink-0" />
            <span>
              Spam filter alert: Check promotional tabs if not arrived in 2
              minutes.
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <button
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-wine px-6 py-3.5 text-sm font-semibold text-ivory shadow-[0_8px_24px_-12px_rgba(74,17,29,0.8)] transition-all hover:-translate-y-0.5 hover:bg-burgundy hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
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
