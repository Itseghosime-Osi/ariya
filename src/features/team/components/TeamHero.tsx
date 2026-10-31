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

  return (
    <section
      aria-labelledby="team-circle-title"
      className="bento-card relative overflow-hidden p-6 sm:p-7"
    >
      <span
        className="weave absolute inset-y-0 right-0 w-24 opacity-[0.06]"
        aria-hidden="true"
      />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
            The circle
          </div>
          <h2
            id="team-circle-title"
            className="mt-1 font-display text-2xl font-bold text-night"
          >
            {members.length === 1
              ? "You are planning this one alone"
              : `${members.length} people planning together`}
          </h2>
          <p className="mt-1 max-w-lg text-sm text-label-2">
            You are the{" "}
            <span className="font-semibold" style={{ color: me.ink }}>
              {me.label}
            </span>
            . {me.blurb}
          </p>
        </div>

        <div className="flex items-center">
          <div className="flex -space-x-2.5">
            {avatars.map((member) => {
              const meta = roleMeta(member.role);
              return (
                <span
                  key={member.id}
                  title={`${member.fullName} · ${meta.label}`}
                  className="grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--surface-container-low)] text-xs font-bold shadow-sm"
                  style={{ backgroundColor: meta.wash, color: meta.ink }}
                >
                  <span aria-hidden="true">{initialsOf(member.fullName)}</span>
                  <span className="sr-only">
                    {member.fullName}, {meta.label}
                  </span>
                </span>
              );
            })}
            {overflow > 0 && (
              <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--surface-container-low)] bg-surface-container text-xs font-bold text-label-2 shadow-sm">
                +{overflow}
              </span>
            )}
          </div>
        </div>
      </div>

      <ul className="relative mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {ROLE_ORDER.map((role) => {
          const meta = ROLE_META[role];
          const on = roleFilter === role;
          return (
            <li key={role}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onRoleFilter(on ? "all" : role)}
                className={`flex h-full w-full flex-col items-start gap-1 rounded-2xl border px-3.5 py-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                  on
                    ? "border-burgundy/70 bg-white/60 shadow-sm"
                    : "border-gold-ink/15 bg-transparent hover:bg-white/45"
                }`}
              >
                <span
                  className="grid h-7 w-7 place-items-center rounded-full"
                  style={{ backgroundColor: meta.wash, color: meta.ink }}
                >
                  <Icon name={meta.icon} size={14} />
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-night">
                    {meta.short}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-label-2">
                    {counts[role]}
                  </span>
                </span>
                <span className="text-[11px] leading-snug text-label-2">
                  {meta.blurb}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!canManageMembers && (
        <p className="relative mt-4 flex items-center gap-1.5 text-xs text-label-3">
          <Icon name="lock" size={13} />
          Only owners and planners can invite or change roles.
        </p>
      )}
    </section>
  );
}
