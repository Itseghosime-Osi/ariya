"use client";

import React, { useActionState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { inviteTeamMemberAction, type TeamActionState } from "../actions";

interface InviteMemberModalProps {
  eventId: string;
  isOpen: boolean;
  canManageOwners: boolean;
  onClose: () => void;
}

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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-outline-variant/60 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
          <div className="flex items-center gap-2">
            <Icon name="person_add" className="text-xl text-wine" />
            <h3
              id="invite-modal-title"
              className="font-serif text-lg font-bold text-night"
            >
              Invite Team Member
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-mist hover:text-night hover:bg-surface-container"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-center gap-2">
            <Icon name="error" className="text-base text-red-600 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wider text-wine/80 block"
            >
              Collaborator Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="colleague@lagos.ng"
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 text-sm focus:outline-none focus:ring-2 focus:ring-wine/40"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="role"
              className="text-xs font-semibold uppercase tracking-wider text-wine/80 block"
            >
              Assigned Role
            </label>
            <select
              id="role"
              name="role"
              defaultValue="staff"
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 text-sm focus:outline-none focus:ring-2 focus:ring-wine/40 bg-white"
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

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-night"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 rounded-xl bg-wine text-ivory text-sm font-semibold hover:bg-wine/90 transition-all disabled:opacity-50 flex items-center gap-2 min-h-[40px]"
            >
              {isPending ? (
                <>
                  <Icon
                    name="progress_activity"
                    className="animate-spin text-base"
                  />
                  <span>Sending Invitation...</span>
                </>
              ) : (
                <>
                  <Icon name="send" className="text-base" />
                  <span>Send Team Invite</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
