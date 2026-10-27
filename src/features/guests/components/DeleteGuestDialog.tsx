"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GuestWithDetails } from "../types";
import { AlertTriangle } from "lucide-react";

interface DeleteGuestDialogProps {
  guest: GuestWithDetails | null;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteGuestDialog({
  guest,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteGuestDialogProps) {
  if (!guest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="gap-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center font-serif text-xl">
            Remove Guest from Roster?
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-on-surface-variant">
            Are you sure you want to remove{" "}
            <strong className="text-on-surface">{guest.name}</strong>? Their
            invitation link will immediately become invalid, and any assigned
            table seats will be freed.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Removing..." : "Remove Guest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
