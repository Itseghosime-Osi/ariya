"use client";

import React, { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { TeamRoleBadge } from "./TeamRoleBadge";
import { updateTeamMemberRoleAction, removeTeamMemberAction } from "../actions";
import type { TeamMember, EventRole } from "../types";

interface TeamMemberListProps {
  eventId: string;
  members: TeamMember[];
  currentUserRole: EventRole;
  canManageMembers: boolean;
  canManageOwners: boolean;
}

export function TeamMemberList({
  eventId,
  members,
  canManageMembers,
  canManageOwners,
}: TeamMemberListProps) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const ownerCount = members.filter((m) => m.role === "owner").length;

  const handleRoleChange = (targetUserId: string, newRole: EventRole) => {
    setActionError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("targetUserId", targetUserId);
      formData.set("newRole", newRole);
      const res = await updateTeamMemberRoleAction(eventId, formData);
      if (res.error) setActionError(res.error);
    });
  };

  const handleRemove = (targetUserId: string, memberName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${memberName} from this celebration?`
      )
    ) {
      return;
    }
    setActionError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("targetUserId", targetUserId);
      const res = await removeTeamMemberAction(eventId, formData);
      if (res.error) setActionError(res.error);
    });
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 space-y-4">
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-center gap-2">
          <Icon name="error" className="text-base text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="divide-y divide-outline-variant/40">
        {members.map((member) => {
          const isLastOwner = member.role === "owner" && ownerCount <= 1;
          const canEditThisMember =
            canManageMembers &&
            !member.isCurrentUser &&
            (canManageOwners ||
              (member.role !== "owner" && member.role !== "planner"));

          return (
            <div
              key={member.id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-wine/10 text-wine flex items-center justify-center font-bold text-sm">
                  {member.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-night text-sm">
                      {member.fullName}
                    </span>
                    {member.isCurrentUser && (
                      <span className="text-[10px] uppercase font-bold text-mist tracking-wider">
                        (You)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {member.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                {canEditThisMember ? (
                  <select
                    value={member.role}
                    disabled={isPending}
                    onChange={(e) =>
                      handleRoleChange(
                        member.userId,
                        e.target.value as EventRole
                      )
                    }
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-white text-night focus:ring-2 focus:ring-wine/40"
                  >
                    {canManageOwners && <option value="owner">Owner</option>}
                    {canManageOwners && (
                      <option value="planner">Lead Planner</option>
                    )}
                    <option value="couple">Celebrant Couple</option>
                    <option value="staff">Event Staff</option>
                  </select>
                ) : (
                  <TeamRoleBadge role={member.role} />
                )}

                {canEditThisMember && !isLastOwner && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRemove(member.userId, member.fullName)}
                    aria-label={`Remove ${member.fullName}`}
                    className="p-1.5 text-mist hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Icon name="delete" className="text-base" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
