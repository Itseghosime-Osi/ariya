"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
import { TeamRoleBadge } from "./TeamRoleBadge";
import type { EventRole, TeamMember } from "../types";
import { initialsOf, roleMeta } from "../lib/roles";

interface TeamMemberCardProps {
  member: TeamMember;
  ownerCount: number;
  canManageMembers: boolean;
  canManageOwners: boolean;
  isPending: boolean;
  onRoleChange: (userId: string, role: EventRole) => void;
  onRemove: (userId: string, name: string) => void;
}

/** One person in the circle: who they are, what they may do, and the controls to change it. */
export function TeamMemberCard({
  member,
  ownerCount,
  canManageMembers,
  canManageOwners,
  isPending,
  onRoleChange,
  onRemove,
}: TeamMemberCardProps) {
  const meta = roleMeta(member.role);
  const isLastOwner = member.role === "owner" && ownerCount <= 1;
  const canEdit =
    canManageMembers &&
    !member.isCurrentUser &&
    (canManageOwners || (member.role !== "owner" && member.role !== "planner"));

  return (
    <li className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-white/55 sm:flex-row sm:items-center sm:px-6">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold"
        style={{ backgroundColor: meta.wash, color: meta.ink }}
        aria-hidden="true"
      >
        {initialsOf(member.fullName)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-night">
            {member.fullName}
          </span>
          {member.isCurrentUser && (
            <span className="rounded-full bg-tint-sage px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rsvp-accepted">
              You
            </span>
          )}
        </div>
        <p className="truncate text-xs text-label-2">{member.email}</p>
        <p className="mt-0.5 text-[11px] text-label-3">{meta.blurb}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2 self-stretch sm:self-center">
        {canEdit ? (
          <label className="relative">
            <span className="sr-only">Role for {member.fullName}</span>
            <select
              value={member.role}
              disabled={isPending}
              onChange={(event) =>
                onRoleChange(member.userId, event.target.value as EventRole)
              }
              className="desk-field min-h-[38px] cursor-pointer rounded-full pl-4 pr-9 text-xs font-semibold text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none disabled:opacity-50"
            >
              {canManageOwners && <option value="owner">Owner</option>}
              {canManageOwners && <option value="planner">Lead Planner</option>}
              <option value="couple">Celebrant Couple</option>
              <option value="staff">Event Staff</option>
            </select>
          </label>
        ) : (
          <TeamRoleBadge role={member.role} />
        )}

        {canEdit && !isLastOwner && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onRemove(member.userId, member.fullName)}
            aria-label={`Remove ${member.fullName}`}
            className="grid h-10 w-10 place-items-center rounded-full text-label-3 transition-colors hover:bg-error-container hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:opacity-50"
          >
            <Icon name="delete" size={16} />
          </button>
        )}
        {isLastOwner && member.role === "owner" && (
          <span
            className="grid h-10 w-10 place-items-center text-label-3"
            title="A celebration always keeps at least one owner"
          >
            <Icon name="lock" size={14} />
          </span>
        )}
      </div>
    </li>
  );
}
