"use client";

import React, { useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { cancelTeamInviteAction } from "../actions";
import { TeamRoleBadge } from "./TeamRoleBadge";
import type { TeamInvite } from "../types";

interface PendingInvitesListProps {
  eventId: string;
  invites: TeamInvite[];
  canManageMembers?: boolean;
  onCopied?: (message: string) => void;
}

const DAY = 86_400_000;

function expiresIn(expiresAt: string, now: number): string {
  const days = Math.ceil((new Date(expiresAt).getTime() - now) / DAY);
  if (days <= 0) return "Expired";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

/** Invitations that have gone out but not been accepted yet, with the link ready to send again. */
export function PendingInvitesList({
  eventId,
  invites,
  canManageMembers = false,
  onCopied,
}: PendingInvitesListProps) {
  const [isPending, startTransition] = useTransition();
  const now = Date.now();

  return (
    <section aria-labelledby="pending-invites-title">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
            Waiting
          </div>
          <h2
            id="pending-invites-title"
            className="mt-1 font-display text-2xl font-bold text-night"
          >
            Pending invitations
          </h2>
        </div>
        <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-bold tabular-nums text-label-2">
          {invites.length}
        </span>
      </div>

      {invites.length === 0 ? (
        <div className="bento-card flex items-center gap-3 px-5 py-6">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint-sage text-rsvp-accepted">
            <Icon name="check_circle" size={18} />
          </div>
          <p className="text-sm text-label-2">
            No invitations waiting. Everyone you asked has joined, or no one has
            been invited yet.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-col gap-3 rounded-2xl border border-dashed border-hairline bg-surface-container-low p-4"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint-sky text-[#3b5b8a]">
                  <Icon name="mail" size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-night">
                      {invite.email}
                    </span>
                    <TeamRoleBadge role={invite.role} />
                    {invite.isExpired && (
                      <span className="rounded-full bg-error-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-error">
                        Expired
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-label-2">
                    {invite.isExpired
                      ? "Expired"
                      : expiresIn(invite.expiresAt, now)}
                    {" · "}
                    sent{" "}
                    {new Date(invite.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
              </div>

              {canManageMembers && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const link = `${window.location.origin}/invite/${invite.token}`;
                      void navigator.clipboard
                        .writeText(link)
                        .then(() => onCopied?.("Invite link copied"))
                        .catch(() => onCopied?.("Could not copy the link"));
                    }}
                    className="desk-chip inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                  >
                    <Icon name="copy" size={14} />
                    Copy invite link
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await cancelTeamInviteAction(
                          eventId,
                          invite.id
                        );
                        onCopied?.(
                          res?.error ? res.error : "Invitation revoked"
                        );
                      });
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-label-2 transition-colors hover:bg-error-container hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:opacity-50"
                  >
                    {isPending ? (
                      <Icon name="refresh" size={14} className="animate-spin" />
                    ) : (
                      <Icon name="close" size={14} />
                    )}
                    Revoke
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
