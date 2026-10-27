"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";

export function ResetPasswordSuccess() {
  const router = useRouter();

  return (
    <section className="relative bg-paper rounded-xl p-8 lg:p-10 shadow-md flex flex-col justify-between overflow-hidden max-w-lg mx-auto w-full">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-success" />
      <div>
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="font-label-sm text-label-sm uppercase tracking-wider px-3 py-1 rounded-full bg-success-surface text-success font-bold">
            State 04: Passcode Updated
          </span>
          <span className="font-label-md text-label-md text-success font-semibold">
            Complete
          </span>
        </div>

        <div className="flex flex-col items-center text-center py-6 px-4 bg-surface-container-lowest rounded-xl shadow-sm mb-6">
          <div className="w-20 h-20 rounded-full bg-success-surface text-success flex items-center justify-center mb-4 shadow">
            <Icon name="check_circle" className="text-4xl" />
          </div>
          <span className="font-label-md text-label-md uppercase tracking-widest text-success mb-1 font-bold">
            Identity Authenticated
          </span>
          <h2 className="font-headline-md text-headline-md text-night mb-2">
            Passcode Reset Successfully
          </h2>
          <p className="font-body-md text-body-md text-paper-ink max-w-md">
            Your passcode has been updated. Your Àríyá celebration workspace is
            now ready for high-table seating, Aṣọ-Ẹbí tracking, and banquet
            coordination.
          </p>
        </div>

        <div className="space-y-4">
          <button
            className="w-full py-4 px-6 rounded-lg bg-gold text-night font-title-md text-title-md flex items-center justify-center gap-2 shadow-lg hover:bg-secondary-fixed transition-all min-h-[44px]"
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
