"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createGuestAction } from "../actions";
import { GuestFormFields, type GuestFormState } from "./GuestFormFields";

interface GuestFormModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const INITIAL_FORM_STATE: GuestFormState = {
  name: "",
  phone: "",
  email: "",
  side: "mutual",
  group: "",
  partySize: 1,
  plusOnesAllowed: false,
  isVip: false,
  notes: "",
};

export function GuestFormModal({
  eventId,
  isOpen,
  onClose,
  onSuccess,
}: GuestFormModalProps) {
  const [formState, setFormState] =
    React.useState<GuestFormState>(INITIAL_FORM_STATE);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setFormState(INITIAL_FORM_STATE);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await createGuestAction(eventId, {
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

      onSuccess();
      onClose();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            Add New Guest
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 text-sm mt-2"
        >
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <GuestFormFields
            state={formState}
            onChange={(patch) =>
              setFormState((prev) => ({ ...prev, ...patch }))
            }
          />

          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding Guest..." : "Add to Guestbook"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
