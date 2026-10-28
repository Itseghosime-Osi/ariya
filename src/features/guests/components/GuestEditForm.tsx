"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { GuestWithDetails } from "../types";
import { updateGuestAction } from "../actions";
import { GuestFormFields, type GuestFormState } from "./GuestFormFields";

interface GuestEditFormProps {
  eventId: string;
  guest: GuestWithDetails;
  onSuccess: (updatedGuest: GuestWithDetails) => void;
  onCancel: () => void;
}

export function GuestEditForm({
  eventId,
  guest,
  onSuccess,
  onCancel,
}: GuestEditFormProps) {
  const [formState, setFormState] = React.useState<GuestFormState>({
    name: guest.name,
    phone: guest.phone || "",
    email: guest.email || "",
    side: guest.side || "mutual",
    group: guest.group_name || "",
    partySize: guest.party_size,
    plusOnesAllowed: Boolean(guest.plus_ones_allowed),
    isVip: guest.is_vip,
    notes: guest.notes || "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await updateGuestAction(guest.id, eventId, {
        name: formState.name,
        phone: formState.phone || null,
        email: formState.email || null,
        side: formState.side,
        group_name: formState.group || null,
        party_size: Number(formState.partySize),
        plus_ones_allowed: formState.plusOnesAllowed,
        is_vip: formState.isVip,
        notes: formState.notes || null,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      onSuccess({
        ...guest,
        name: formState.name,
        phone: formState.phone || null,
        email: formState.email || null,
        side: formState.side,
        group_name: formState.group || null,
        party_size: Number(formState.partySize),
        plus_ones_allowed: formState.plusOnesAllowed,
        is_vip: formState.isVip,
        notes: formState.notes || null,
      });
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <GuestFormFields
        state={formState}
        onChange={(patch) => setFormState((prev) => ({ ...prev, ...patch }))}
      />

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/40">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
