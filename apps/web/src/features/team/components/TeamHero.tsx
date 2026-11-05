"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
import type { EventRole, TeamMember } from "../types";
import { ROLE_META, ROLE_ORDER, initialsOf, roleMeta } from "../lib/roles";

export type RoleFilter = "all" | EventRole;

/**
 * The planning circle at a glance: everyone's initials, how many hold each role, and what each role
 * is trusted to do. Pressing a role narrows the member list below to that role.
 */
export function TeamHero({
  members,
  currentUserRole,
  roleFilter,
  onRoleFilter,
  canManageMembers,
}: {
  members: TeamMember[];
  currentUserRole: EventRole;
  roleFilter: RoleFilter;
  onRoleFilter: (value: RoleFilter) => void;
  canManageMembers: boolean;
}) {
  const me = roleMeta(currentUserRole);
  const counts = ROLE_ORDER.reduce(
    (acc, role) => {
      acc[role] = members.filter((member) => member.role === role).length;
      return acc;
    },
    {} as Record<EventRole, number>
  );

  const avatars = members.slice(0, 8);
  const overflow = members.length - avatars.length;
  // Phones show the first four faces, then a count of everyone else.
  const phoneOverflow = members.length - 4;

  return (
    <section
      aria-labelledby="team-circle-title"
      className="bento-card relative overflow-hidden p-4 sm:p-7"
    >
      <span
        className="weave absolute inset-y-0 right-0 w-24 opacity-[0.06]"
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-3 sm:flex-wrap sm:gap-6">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
            The circle
          </div>
          <h2
            id="team-circle-title"
            className="mt-1 font-display text-lg font-bold leading-tight text-night sm:text-2xl"
          >
            {members.length === 1
              ? "You are planning this one alone"
              : `${members.length} people planning together`}
          </h2>
          <p className="mt-1 max-w-lg text-[13px] text-label-2 sm:text-sm">
            You are the{" "}
            <span className="font-semibold" style={{ color: me.ink }}>
              {me.label}
            </span>
            <span className="hidden sm:inline">. {me.blurb}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          <div className="flex -space-x-2 sm:-space-x-2.5">
            {avatars.map((member, i) => {
              const meta = roleMeta(member.role);
              return (
                <span
                  key={member.id}
                  title={`${member.fullName} · ${meta.label}`}
                  className={`${i >= 4 ? "hidden sm:grid" : "grid"} h-8 w-8 place-items-center rounded-full border-2 border-[var(--surface-container-low)] text-[11px] font-bold shadow-sm sm:h-10 sm:w-10 sm:text-xs`}
                  style={{ backgroundColor: meta.wash, color: meta.ink }}
                >
                  <span aria-hidden="true">{initialsOf(member.fullName)}</span>
                  <span className="sr-only">
                    {member.fullName}, {meta.label}
                  </span>
                </span>
              );
            })}
            {phoneOverflow > 0 && (
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--surface-container-low)] bg-surface-container text-[11px] font-bold text-label-2 shadow-sm sm:hidden">
                +{phoneOverflow}
              </span>
            )}
            {overflow > 0 && (
              <span className="hidden h-10 w-10 place-items-center rounded-full border-2 border-[var(--surface-container-low)] bg-surface-container text-xs font-bold text-label-2 shadow-sm sm:grid">
                +{overflow}
              </span>
            )}
          </div>
        </div>
      </div>

      <ul className="relative -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:mt-6 sm:grid sm:grid-cols-4 sm:gap-2.5 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {ROLE_ORDER.map((role) => {
          const meta = ROLE_META[role];
          const on = roleFilter === role;
          return (
            <li key={role} className="shrink-0 sm:shrink">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onRoleFilter(on ? "all" : role)}
                className={`flex h-full w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-all sm:flex-col sm:items-start sm:gap-1 sm:rounded-2xl sm:px-3.5 sm:py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                  on
                    ? "border-burgundy/70 bg-white/60 shadow-sm"
                    : "border-gold-ink/15 bg-transparent hover:bg-white/45"
                }`}
              >
                <span
                  className="grid h-6 w-6 place-items-center rounded-full sm:h-7 sm:w-7"
                  style={{ backgroundColor: meta.wash, color: meta.ink }}
                >
                  <Icon name={meta.icon} size={13} />
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-night">
                    {meta.short}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-label-2">
                    {counts[role]}
                  </span>
                </span>
                <span className="hidden text-[11px] leading-snug text-label-2 sm:block">
                  {meta.blurb}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!canManageMembers && (
        <p className="relative mt-3 flex items-center gap-1.5 text-xs text-label-3 sm:mt-4">
          <Icon name="lock" size={13} />
          Only owners and planners can invite or change roles.
        </p>
      )}
    </section>
  );
}
