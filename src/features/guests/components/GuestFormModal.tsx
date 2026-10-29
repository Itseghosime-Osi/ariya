"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
      <DialogContent className="max-h-[92vh] max-w-xl gap-0 overflow-y-auto border border-gold/30 bg-ivory p-0">
        <DialogHeader className="relative gap-1.5 px-6 pb-5 pt-7 sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
            Guest registry
          </p>
          <DialogTitle className="font-serif text-3xl font-bold leading-tight">
            Add New Guest
          </DialogTitle>
          <DialogDescription>
            Each party gets a personal RSVP link to share on WhatsApp.
          </DialogDescription>
          <span
            aria-hidden="true"
            className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-gold/70 via-gold/20 to-transparent sm:inset-x-8"
          />
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 px-6 pb-6 pt-5 text-sm sm:px-8"
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

          <DialogFooter className="mt-2 flex flex-col-reverse gap-2 border-t border-outline-variant/60 pt-5 sm:flex-row sm:justify-end sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full px-6"
            >
              {isSubmitting ? "Adding Guest..." : "Add to Guestbook"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
