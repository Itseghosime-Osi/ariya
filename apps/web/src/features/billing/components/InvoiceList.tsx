import React from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { formatKobo, formatLagosDate } from "@/lib/format";
import type { InvoiceItem } from "../types";

interface InvoiceListProps {
  invoices: InvoiceItem[];
}

const STATUS_META: Record<
  InvoiceItem["status"],
  { label: string; ink: string; wash: string; icon: IconName }
> = {
  paid: {
    label: "Paid",
    ink: "#1f6b4a",
    wash: "#eaf4ee",
    icon: "check_circle",
  },
  issued: {
    label: "Issued",
    ink: "#7a5612",
    wash: "#f3e9d6",
    icon: "receipt_long",
  },
  draft: { label: "Draft", ink: "#5a474e", wash: "#f2ede4", icon: "edit" },
  void: { label: "Void", ink: "#9e2a2b", wash: "#f6e3e6", icon: "close" },
};

const SHORT_DATE = { day: "numeric", month: "short", year: "numeric" } as const;

/** The formal record: a numbered invoice for each settled pass, kept for tax and sponsors. */
export function InvoiceList({ invoices }: InvoiceListProps) {
  if (invoices.length === 0) return null;

  return (
    <section aria-labelledby="invoices-title" className="bento-card p-4 sm:p-7">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
        Tax paper
      </div>
      <h2
        id="invoices-title"
        className="mt-1 font-display text-xl font-bold text-night sm:text-2xl"
      >
        Invoices & receipts
      </h2>

      <ul className="mt-3 divide-y divide-hairline sm:mt-4">
        {invoices.map((invoice) => {
          const meta = STATUS_META[invoice.status];
          return (
            <li
              key={invoice.id}
              className="flex items-center justify-between gap-3 py-3 sm:py-3.5"
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
                    <span className="font-mono text-xs font-semibold text-night">
                      {invoice.invoiceNumber}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: meta.wash, color: meta.ink }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-label-2">
                    <span className="sm:hidden">
                      Issued{" "}
                      {formatLagosDate(invoice.issuedAt, {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="hidden sm:inline">
                      Issued {formatLagosDate(invoice.issuedAt, SHORT_DATE)}
                      {invoice.paidAt
                        ? ` · settled ${formatLagosDate(invoice.paidAt, SHORT_DATE)}`
                        : ""}
                    </span>
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right font-display text-base font-bold text-night tabular-nums sm:text-lg">
                {formatKobo(invoice.amountKobo)}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
