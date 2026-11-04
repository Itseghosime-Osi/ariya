"use client";

import React, { useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { formatKobo, formatLagosDate } from "@/lib/format";
import type { PaymentItem } from "../types";

type PaymentStatus = PaymentItem["status"];
type Filter = "all" | PaymentStatus;

const STATUS_META: Record<
  PaymentStatus,
  { label: string; ink: string; wash: string; icon: IconName }
> = {
  success: {
    label: "Succeeded",
    ink: "#1f6b4a",
    wash: "#eaf4ee",
    icon: "check_circle",
  },
  pending: {
    label: "Pending",
    ink: "#7a5612",
    wash: "#f3e9d6",
    icon: "schedule",
  },
  failed: {
    label: "Failed",
    ink: "#9e2a2b",
    wash: "#f6e3e6",
    icon: "error",
  },
  refunded: {
    label: "Refunded",
    ink: "#5a474e",
    wash: "#f2ede4",
    icon: "refresh",
  },
};

const FILTERS: Filter[] = ["all", "success", "pending", "failed", "refunded"];

function formatStamp(value: string | null): string {
  if (!value) return "—";
  return formatLagosDate(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Every checkout attempt, newest first, as a receipt trail. Filter it to see just the failures. */
export function PaymentTimeline({
  payments,
  onCopied,
}: {
  payments: PaymentItem[];
  onCopied?: (message: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    return payments.reduce(
      (acc, payment) => {
        acc[payment.status] = (acc[payment.status] ?? 0) + 1;
        return acc;
      },
      { success: 0, pending: 0, failed: 0, refunded: 0 } as Record<
        PaymentStatus,
        number
      >
    );
  }, [payments]);

  const visible = payments
    .filter((payment) => filter === "all" || payment.status === filter)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return (
    <section aria-labelledby="payments-title" className="bento-card p-6 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
            Receipts
          </div>
          <h2
            id="payments-title"
            className="mt-1 font-display text-2xl font-bold text-night"
          >
            Payment trail
          </h2>
        </div>
        <dl className="text-right">
          <dt className="text-[11px] uppercase tracking-[0.16em] text-label-2">
            Settled
          </dt>
          <dd className="font-display text-xl font-bold text-night tabular-nums">
            {formatKobo(
              payments
                .filter((p) => p.status === "success")
                .reduce((sum, p) => sum + p.amountKobo, 0)
            )}
          </dd>
        </dl>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.filter(
          (value) => value === "all" || counts[value] > 0 || filter === value
        ).map((value) => {
          const on = filter === value;
          const count = value === "all" ? payments.length : counts[value];
          const label = value === "all" ? "All" : STATUS_META[value].label;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(value)}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                on
                  ? "border border-burgundy bg-burgundy text-ivory"
                  : "desk-chip text-label-2 hover:text-night"
              }`}
            >
              {label}
              <span
                className={`tabular-nums ${on ? "text-ivory/70" : "text-label-3"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-hairline px-4 py-8 text-center text-sm text-label-2">
          {payments.length === 0
            ? "No payments yet. Every checkout attempt will appear here, successful or not."
            : `Nothing ${filter === "all" ? "" : STATUS_META[filter as PaymentStatus].label.toLowerCase()} in the trail.`}
        </p>
      ) : (
        <ol className="mt-5 divide-y divide-hairline border-t border-hairline">
          {visible.map((payment) => {
            const meta = STATUS_META[payment.status];
            return (
              <li
                key={payment.id}
                className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full"
                    style={{ backgroundColor: meta.wash, color: meta.ink }}
                    aria-hidden="true"
                  >
                    <Icon name={meta.icon} size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(payment.paystackReference)
                            .then(() => onCopied?.("Reference copied"))
                            .catch(() => onCopied?.("Could not copy"));
                        }}
                        className="inline-flex items-center gap-1 rounded font-mono text-xs font-semibold text-night hover:text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                        title="Copy reference"
                      >
                        {payment.paystackReference}
                        <Icon name="copy" size={11} className="text-label-3" />
                      </button>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: meta.wash, color: meta.ink }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-label-2">
                      {payment.channel
                        ? `via ${payment.channel.replace(/_/g, " ")} · `
                        : ""}
                      {"started "}
                      {formatStamp(payment.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="font-display text-lg font-bold text-night tabular-nums">
                    {formatKobo(payment.amountKobo)}
                  </div>
                  <div className="text-[11px] text-label-2">
                    {payment.paidAt
                      ? `Paid ${formatStamp(payment.paidAt)}`
                      : "Not settled"}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
