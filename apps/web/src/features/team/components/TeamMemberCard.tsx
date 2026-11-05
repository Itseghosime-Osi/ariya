"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
import { TeamRoleBadge } from "./TeamRoleBadge";
import type { EventRole, TeamMember } from "../types";
import { ROLE_META, initialsOf, roleMeta } from "../lib/roles";

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
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/55 sm:px-6 sm:py-4">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold sm:h-11 sm:w-11"
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
        <p className="mt-0.5 hidden text-[11px] text-label-3 sm:block">
          {meta.blurb}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {canEdit ? (
          <label className="relative">
            <span className="sr-only">Role for {member.fullName}</span>
            <select
              value={member.role}
              disabled={isPending}
              onChange={(event) =>
                onRoleChange(member.userId, event.target.value as EventRole)
              }
              className="desk-field min-h-[38px] cursor-pointer rounded-full pl-3 pr-8 text-xs font-semibold sm:pl-4 sm:pr-9 text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none disabled:opacity-50"
            >
              {canManageOwners && (
                <option value="owner">{ROLE_META.owner.short}</option>
              )}
              {canManageOwners && (
                <option value="planner">{ROLE_META.planner.short}</option>
              )}
              <option value="couple">{ROLE_META.couple.short}</option>
              <option value="staff">{ROLE_META.staff.short}</option>
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
            className="grid h-9 w-9 place-items-center rounded-full text-label-3 transition-colors hover:bg-error-container sm:h-10 sm:w-10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:opacity-50"
          >
            <Icon name="delete" size={16} />
          </button>
        )}
        {isLastOwner && member.role === "owner" && (
          <span
            className="grid h-9 w-9 place-items-center text-label-3 sm:h-10 sm:w-10"
            title="A celebration always keeps at least one owner"
          >
            <Icon name="lock" size={14} />
          </span>
        )}
      </div>
    </li>
  );
}
