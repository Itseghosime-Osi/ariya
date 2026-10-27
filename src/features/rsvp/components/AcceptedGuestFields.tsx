import React from "react";
import type { InvitationGuest, InvitationRsvp } from "../types";

interface AcceptedGuestFieldsProps {
  guest: InvitationGuest;
  rsvp?: InvitationRsvp | null;
  maxParty: number;
  attendingCount: number;
  onAttendingCountChange: (count: number) => void;
}

export function AcceptedGuestFields({
  guest,
  rsvp,
  maxParty,
  attendingCount,
  onAttendingCountChange,
}: AcceptedGuestFieldsProps) {
  return (
    <div className="space-y-4 pt-2 border-t border-outline-variant/30">
      {maxParty > 1 && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-wine/80 block">
            Number of Attending Guests (Up to {maxParty})
          </label>
          <select
            name="attendingCount"
            value={attendingCount}
            onChange={(e) => onAttendingCountChange(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
          >
            {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "Guest" : "Guests"}
              </option>
            ))}
          </select>
        </div>
      )}

      {maxParty <= 1 && <input type="hidden" name="attendingCount" value={1} />}

      {guest.plus_ones_allowed && attendingCount > 1 && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-wine/80 block">
            Plus One Full Name
          </label>
          <input
            type="text"
            name="plusOneName"
            defaultValue={rsvp?.plus_one_name || ""}
            placeholder="Guest full name"
            className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-wine/80 block">
          Dietary Requirements &amp; Notes
        </label>
        <input
          type="text"
          name="dietary"
          defaultValue={rsvp?.dietary || ""}
          placeholder="e.g. Halal, pescatarian, no peanuts"
          className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
        />
      </div>
    </div>
  );
}
