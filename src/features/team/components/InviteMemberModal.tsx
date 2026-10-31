"use client";

import React, { useActionState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { inviteTeamMemberAction, type TeamActionState } from "../actions";

interface InviteMemberModalProps {
  eventId: string;
  isOpen: boolean;
  canManageOwners: boolean;
  onClose: () => void;
}

const LABEL = "text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink";
const FIELD =
  "desk-field mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none";

export function InviteMemberModal({
  eventId,
  isOpen,
  canManageOwners,
  onClose,
}: InviteMemberModalProps) {
  const [state, formAction, isPending] = useActionState<
    TeamActionState,
    FormData
  >(
    (prevState, formData) =>
      inviteTeamMemberAction(eventId, prevState, formData),
    {}
  );

  useEffect(() => {
    if (state.success) {
      onClose();
    }
  }, [state.success, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-md gap-0 overflow-y-auto border border-gold/30 bg-ivory p-0">
        <DialogHeader className="relative gap-1.5 px-6 pb-5 pt-7 sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
            The circle
          </p>
          <DialogTitle className="font-serif text-3xl font-bold leading-tight">
            Invite to the team
          </DialogTitle>
          <DialogDescription>
            They get a link by email and see only what their role allows.
          </DialogDescription>
          <span
            aria-hidden="true"
            className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-gold/70 via-gold/20 to-transparent sm:inset-x-8"
          />
        </DialogHeader>

        <form
          action={formAction}
          className="flex flex-col gap-4 px-6 pb-6 pt-5 sm:px-8"
        >
          {state.error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-error/30 bg-error-container px-3 py-2 text-xs text-error"
            >
              <Icon name="error" size={14} className="shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <div>
            <label htmlFor="invite-email" className={LABEL}>
              Collaborator Email
            </label>
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              placeholder="colleague@lagos.ng"
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="invite-role" className={LABEL}>
              Assigned Role
            </label>
            <select
              id="invite-role"
              name="role"
              defaultValue="staff"
              className={`${FIELD} cursor-pointer`}
            >
              {canManageOwners && (
                <option value="owner">Owner (Full access)</option>
              )}
              {canManageOwners && (
                <option value="planner">
                  Lead Planner (Manage guests & staff)
                </option>
              )}
              <option value="couple">
                Celebrant Couple (Review & overview)
              </option>
              <option value="staff">
                Event Staff (Check-in desk & scanning)
              </option>
            </select>
          </div>

          <DialogFooter className="mt-2 flex flex-col-reverse gap-2 border-t border-outline-variant/60 pt-5 sm:flex-row sm:justify-end sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="rounded-full px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full px-6"
            >
              {isPending ? "Sending Invitation..." : "Send Team Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
