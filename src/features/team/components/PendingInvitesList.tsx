"use client";

import React, { useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { cancelTeamInviteAction } from "../actions";
import { TeamRoleBadge } from "./TeamRoleBadge";
import type { TeamInvite } from "../types";

interface PendingInvitesListProps {
  eventId: string;
  invites: TeamInvite[];
}

export function PendingInvitesList({
  eventId,
  invites,
}: PendingInvitesListProps) {
  const [isPending, startTransition] = useTransition();

  if (invites.length === 0) return null;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Icon name="mail" className="text-xl text-wine" />
        <h3 className="font-serif text-lg font-bold text-on-surface">
          Pending Invitations ({invites.length})
        </h3>
      </div>

      <div className="divide-y divide-outline-variant/40">
        {invites.map((inv) => (
          <div
            key={inv.id}
            className="py-3.5 flex items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold text-night">
                  {inv.email}
                </span>
                <TeamRoleBadge role={inv.role} />
                {inv.isExpired && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                    Expired
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant">
                Expires {new Date(inv.expiresAt).toLocaleDateString()} • Token:{" "}
                <code className="font-mono text-[11px] bg-stone-100 px-1 py-0.5 rounded">
                  {inv.token.slice(0, 10)}...
                </code>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/invite/${inv.token}`
                  );
                }}
                className="text-xs text-wine hover:text-wine/80 font-medium px-2.5 py-1.5 rounded-lg border border-outline-variant/60 hover:bg-wine/5 transition-colors flex items-center gap-1"
              >
                <Icon name="content_copy" className="text-xs" />
                <span>Copy Invite Link</span>
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await cancelTeamInviteAction(eventId, inv.id);
                  });
                }}
                className="text-xs text-red-600 hover:text-red-800 font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Revoke
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
