"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { pluralise } from "@/lib/metrics";
import { formatArrival } from "../format";
import type { CheckInResult } from "../types";

interface CheckInVerifyCardProps {
  result: CheckInResult;
  loading: boolean;
  onAdmit: (count: number) => void;
  onCancel: () => void;
}

/** A scanned pass that checks out: who it is, then one clear Admit. */
export function CheckInVerifyCard({
  result,
  loading,
  onAdmit,
  onCancel,
}: CheckInVerifyCardProps) {
  const remaining = Math.max(1, result.remaining ?? 1);
  const [count, setCount] = useState(remaining);
  const attending = result.attending_count ?? remaining;
  const arrived = result.checked_in_count ?? 0;

  return (
    <section
      aria-live="polite"
      className="profile-card relative overflow-hidden rounded-3xl p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f6e2ad] to-[#d4a85a] text-night shadow-[0_4px_14px_rgba(212,168,90,0.4)]">
          <Icon name="verified" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#f3d98f]">
            Verified invitation
          </p>
          <h3 className="mt-0.5 truncate font-serif text-2xl text-[#fff6dc]">
            {result.guest_name || "Honoured guest"}
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Dismiss"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#f4e8cc] hover:bg-white/10"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-white/[0.07] px-2 py-2.5">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-[#f4e8cc]">
            Party
          </dt>
          <dd className="text-[15px] font-semibold text-[#fff6dc]">
            {attending}
          </dd>
        </div>
        <div className="rounded-2xl bg-white/[0.07] px-2 py-2.5">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-[#f4e8cc]">
            Arrived
          </dt>
          <dd className="text-[15px] font-semibold text-[#fff6dc]">
            {arrived}
          </dd>
        </div>
        <div className="rounded-2xl bg-white/[0.07] px-2 py-2.5">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-[#f4e8cc]">
            Table
          </dt>
          <dd className="truncate text-[15px] font-semibold text-[#fff6dc]">
            {result.table_name || "Open"}
          </dd>
        </div>
      </dl>

      {remaining > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/[0.07] px-3 py-2">
          <span className="text-[13px] text-[#f4e8cc]">Admit now</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Admit one fewer"
              disabled={count <= 1}
              onClick={() => setCount((c) => c - 1)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[#fff6dc] disabled:opacity-35"
            >
              <Icon name="expand_more" size={16} />
            </button>
            <span className="w-16 text-center text-[14px] font-semibold text-[#fff6dc]">
              {pluralise(count, "guest")}
            </span>
            <button
              type="button"
              aria-label="Admit one more"
              disabled={count >= remaining}
              onClick={() => setCount((c) => c + 1)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[#fff6dc] disabled:opacity-35"
            >
              <Icon name="add_circle" size={16} />
            </button>
          </div>
        </div>
      )}

      {result.first_checked_in_at && (
        <p className="mt-3 text-[13px] text-[#f4e8cc]">
          First arrived at {formatArrival(result.first_checked_in_at)}.
        </p>
      )}

      <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => onAdmit(count)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#f6e2ad] to-[#d4a85a] px-5 text-[15px] font-semibold text-night shadow-[0_6px_18px_rgba(212,168,90,0.35)] disabled:opacity-60"
        >
          <Icon name={loading ? "refresh" : "check_circle"} size={18} />
          {loading ? "Admitting" : `Admit ${pluralise(count, "guest")}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 rounded-full px-4 text-[13px] font-semibold text-[#f4e8cc] hover:bg-white/10"
        >
          Not now
        </button>
      </div>
    </section>
  );
}
