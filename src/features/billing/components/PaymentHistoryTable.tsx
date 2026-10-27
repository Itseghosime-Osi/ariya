import React from "react";
import { Icon } from "@/components/ui/icon";
import type { PaymentItem } from "../types";

interface PaymentHistoryTableProps {
  payments: PaymentItem[];
}

export function PaymentHistoryTable({ payments }: PaymentHistoryTableProps) {
  if (payments.length === 0) return null;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Icon name="receipt_long" className="text-xl text-wine" />
        <h3 className="font-serif text-lg font-bold text-night">
          Payment Transactions ({payments.length})
        </h3>
      </div>

      <div className="divide-y divide-outline-variant/40">
        {payments.map((p) => {
          const isSuccess = p.status === "success";
          const amountNgn = (p.amountKobo / 100).toLocaleString();

          return (
            <div
              key={p.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-night">
                    {p.paystackReference}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      isSuccess
                        ? "bg-emerald-100 text-emerald-800"
                        : p.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Created {new Date(p.createdAt).toLocaleString()}
                  {p.channel ? ` • via ${p.channel}` : ""}
                </p>
              </div>

              <div className="text-right">
                <div className="font-semibold text-night text-sm">
                  ₦{amountNgn}
                </div>
                {p.paidAt && (
                  <p className="text-[10px] text-emerald-700">
                    Paid {new Date(p.paidAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
