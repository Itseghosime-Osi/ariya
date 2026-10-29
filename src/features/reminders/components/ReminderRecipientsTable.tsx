import React from "react";
import { m } from "motion/react";
import { Checkbox } from "@/components/ui/checkbox";
import type { ReminderRecipient } from "../types";

interface ReminderRecipientsTableProps {
  recipients: ReminderRecipient[];
  selectedIds: string[];
  onToggleSelect: (guestId: string) => void;
  onSelectAll: () => void;
}

const STATUS = {
  accepted: { label: "Attending", className: "text-success" },
  declined: { label: "Declined", className: "text-error" },
  pending: { label: "Awaiting reply", className: "text-gold-ink" },
} as const;

const shortDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "Africa/Lagos",
});

function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^\p{L}/u.test(w));
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function ReminderRecipientsTable({
  recipients,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}: ReminderRecipientsTableProps) {
  const eligible = recipients.filter((r) => r.isEligibleForEmail);
  const allSelected =
    eligible.length > 0 && selectedIds.length === eligible.length;

  if (recipients.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-on-surface-variant">
        No guests in this list.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between py-3 text-xs text-on-surface-variant">
        <span>
          {selectedIds.length > 0
            ? `${selectedIds.length} selected`
            : `${recipients.length} ${recipients.length === 1 ? "guest" : "guests"}`}
        </span>
        <button
          type="button"
          onClick={onSelectAll}
          disabled={eligible.length === 0}
          className="min-h-11 font-semibold text-wine underline decoration-outline-variant underline-offset-4 hover:decoration-wine disabled:opacity-50"
        >
          {allSelected ? "Clear selection" : "Select all with email"}
        </button>
      </div>

      <ul className="max-h-[28rem] overflow-y-auto pr-1">
        {recipients.map((r, index) => {
          const checked = selectedIds.includes(r.guestId);
          const status = STATUS[r.rsvpStatus];
          return (
            <m.li
              key={r.guestId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                visualDuration: 0.4,
                bounce: 0.1,
                delay: Math.min(index, 10) * 0.03,
              }}
              className="border-t border-outline-variant/60 first:border-t-0"
            >
              <label
                className={`flex items-center gap-3 rounded-2xl px-2 py-3.5 transition-colors sm:gap-4 sm:px-3 ${
                  r.isEligibleForEmail
                    ? "cursor-pointer hover:bg-ivory"
                    : "cursor-not-allowed opacity-80"
                } ${checked ? "bg-ivory" : ""}`}
              >
                <Checkbox
                  checked={checked}
                  disabled={!r.isEligibleForEmail}
                  onCheckedChange={() => onToggleSelect(r.guestId)}
                  aria-label={`Remind ${r.name}`}
                />
                <span
                  aria-hidden="true"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-serif text-sm font-bold transition-colors ${
                    checked ? "bg-wine text-ivory" : "bg-wine/10 text-wine"
                  }`}
                >
                  {initials(r.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-base font-medium leading-tight text-on-surface">
                    {r.name}
                  </span>
                  <span className="block truncate text-xs text-on-surface-variant">
                    {r.email ??
                      "No email. Message them from the guest list instead."}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${status.className}`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full bg-current"
                    />
                    {status.label}
                  </span>
                  {r.lastSentAt && (
                    <span className="mt-0.5 block text-[11px] text-on-surface-variant">
                      Reminded {shortDate.format(new Date(r.lastSentAt))}
                    </span>
                  )}
                </span>
              </label>
            </m.li>
          );
        })}
      </ul>
    </div>
  );
}
