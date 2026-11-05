"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { FORM_DIALOG, ModalHeader } from "@/components/ui/modal-header";
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
      <DialogContent className={`${FORM_DIALOG} max-w-xl`}>
        <ModalHeader
          icon="person"
          eyebrow="Guest registry"
          title="Add New Guest"
          description="Each party gets a personal RSVP link to share on WhatsApp."
        />

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 px-5 pb-5 pt-4 text-sm sm:px-7"
        >
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-error/30 bg-error-container px-3 py-2 text-xs text-error"
            >
              {error}
            </div>
          )}

          <GuestFormFields
            state={formState}
            onChange={(patch) =>
              setFormState((prev) => ({ ...prev, ...patch }))
            }
          />

          <DialogFooter className="mt-1 flex flex-row justify-end gap-2 border-t border-hairline pt-4 sm:space-x-0">
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
