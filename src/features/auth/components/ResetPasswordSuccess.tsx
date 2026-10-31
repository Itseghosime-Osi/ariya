"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";

export function ResetPasswordSuccess() {
  const router = useRouter();

  return (
    <section className="w-full">
      <div>
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="rounded-full bg-success-surface px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-success">
            Password Updated
          </span>
          <span className="text-xs font-semibold text-success">Complete</span>
        </div>

        <div className="mb-6 flex flex-col items-center border-y border-success/20 py-7 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-surface text-success shadow-sm">
            <Icon name="check_circle" className="text-4xl" />
          </div>
          <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-success">
            Password Changed
          </span>
          <h2 className="mb-2 font-display text-2xl font-semibold text-night">
            Password Reset Successfully
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-label-2">
            Your password has been updated. You can now sign in to manage your
            events, guest lists, and seating plans.
          </p>
        </div>

        <div className="space-y-4">
          <button
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-night shadow-[0_8px_24px_-12px_rgba(74,17,29,0.5)] transition-all hover:-translate-y-0.5 hover:bg-secondary-fixed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
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
