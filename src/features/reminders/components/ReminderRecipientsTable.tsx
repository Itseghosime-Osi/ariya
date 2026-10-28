import React from "react";
import { Icon } from "@/components/ui/icon";
import type { ReminderRecipient } from "../types";

interface ReminderRecipientsTableProps {
  recipients: ReminderRecipient[];
  selectedIds: string[];
  onToggleSelect: (guestId: string) => void;
  onSelectAll: () => void;
}

export function ReminderRecipientsTable({
  recipients,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}: ReminderRecipientsTableProps) {
  const allSelected =
    recipients.length > 0 && selectedIds.length === recipients.length;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
        <h4 className="font-serif text-sm font-bold text-night">
          Target Recipients ({recipients.length})
        </h4>
        <button
          type="button"
          onClick={onSelectAll}
          className="text-xs font-semibold text-wine hover:underline"
        >
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>

      <div className="divide-y divide-outline-variant/30 max-h-[320px] overflow-y-auto pr-1">
        {recipients.map((r) => {
          const isChecked = selectedIds.includes(r.guestId);
          return (
            <div
              key={r.guestId}
              className="py-2.5 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={!r.isEligibleForEmail}
                  onChange={() => onToggleSelect(r.guestId)}
                  className="rounded text-wine focus:ring-wine"
                />
                <div>
                  <div className="font-semibold text-night">{r.name}</div>
                  <div className="text-on-surface-variant text-[11px]">
                    {r.email || (
                      <span className="text-amber-700 flex items-center gap-0.5">
                        <Icon name="error" className="text-xs" />
                        No email address
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700">
                  {r.rsvpStatus}
                </span>
                {r.lastSentAt && (
                  <p className="text-[10px] text-mist mt-0.5">
                    Sent {new Date(r.lastSentAt).toLocaleDateString()}
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
