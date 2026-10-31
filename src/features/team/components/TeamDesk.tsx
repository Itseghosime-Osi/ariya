"use client";

import React, { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { DeskPageHeader } from "@/components/ui/desk-page-header";
import { useDeskToast } from "@/components/ui/desk-toast";
import {
  DeskItem,
  DeskMotion,
} from "@/features/events/components/desk/DeskMotion";
import { TeamHero, type RoleFilter } from "./TeamHero";
import { TeamMemberCard } from "./TeamMemberCard";
import { PendingInvitesList } from "./PendingInvitesList";
import { InviteMemberModal } from "./InviteMemberModal";
import { updateTeamMemberRoleAction, removeTeamMemberAction } from "../actions";
import type { EventRole, TeamDeskData } from "../types";
import { roleMeta } from "../lib/roles";

interface TeamDeskProps {
  eventId: string;
  eventTitle: string;
  data: TeamDeskData;
}

export function TeamDesk({ eventId, eventTitle, data }: TeamDeskProps) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [query, setQuery] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { showToast, toast } = useDeskToast();

  const ownerCount = data.members.filter((m) => m.role === "owner").length;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.members.filter((member) => {
      const inRole = roleFilter === "all" || member.role === roleFilter;
      const matches =
        !needle ||
        member.fullName.toLowerCase().includes(needle) ||
        member.email.toLowerCase().includes(needle);
      return inRole && matches;
    });
  }, [data.members, roleFilter, query]);

  const handleRoleChange = (targetUserId: string, newRole: EventRole) => {
    setActionError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("targetUserId", targetUserId);
      formData.set("newRole", newRole);
      const res = await updateTeamMemberRoleAction(eventId, formData);
      if (res.error) {
        setActionError(res.error);
        return;
      }
      showToast(`Role changed to ${roleMeta(newRole).label}`);
    });
  };

  const handleRemove = (targetUserId: string, memberName: string) => {
    if (
      !confirm(`Remove ${memberName} from this celebration? They lose access.`)
    ) {
      return;
    }
    setActionError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("targetUserId", targetUserId);
      const res = await removeTeamMemberAction(eventId, formData);
      if (res.error) {
        setActionError(res.error);
        return;
      }
      showToast(`${memberName} removed`);
    });
  };

  return (
    <div className="pb-16">
      {toast}

      <DeskMotion className="space-y-6 lg:space-y-8">
        <DeskItem>
          <DeskPageHeader
            eyebrow={`Team · ${eventTitle}`}
            title="The people behind the day"
            description="Bring in co-planners, the couple and the door staff, and give each of them only what they need."
          >
            {data.canManageMembers && (
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-burgundy px-5 text-sm font-semibold text-ivory shadow-sm transition-colors hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                <Icon name="diversity_3" size={18} />
                Invite member
              </button>
            )}
          </DeskPageHeader>
        </DeskItem>

        <DeskItem>
          <TeamHero
            members={data.members}
            currentUserRole={data.currentUserRole}
            roleFilter={roleFilter}
            onRoleFilter={setRoleFilter}
            canManageMembers={data.canManageMembers}
          />
        </DeskItem>

        {actionError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-2xl border border-error/30 bg-error-container px-4 py-3 text-sm text-error"
          >
            <span className="flex items-center gap-2">
              <Icon name="error" size={16} />
              {actionError}
            </span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              aria-label="Dismiss error"
              className="rounded-full p-1 hover:bg-white/40"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}

        <DeskItem>
          <section aria-labelledby="team-members-title">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
                  Everyone
                </div>
                <h2
                  id="team-members-title"
                  className="mt-1 font-display text-2xl font-bold text-night"
                >
                  {roleFilter === "all"
                    ? "Members"
                    : roleMeta(roleFilter).label + "s"}
                  <span className="ml-2 align-middle text-sm font-normal text-label-2 tabular-nums">
                    {visible.length}
                  </span>
                </h2>
              </div>

              <label className="relative w-full sm:w-72">
                <span className="sr-only">Search members</span>
                <Icon
                  name="search"
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-label-2"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name or email"
                  className="desk-field min-h-[44px] w-full rounded-full pl-12 pr-5 text-sm text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none"
                />
              </label>
            </div>

            {visible.length === 0 ? (
              <div className="bento-card flex flex-col items-center px-6 py-12 text-center">
                <h3 className="font-display text-xl font-bold text-night">
                  No one here yet
                </h3>
                <p className="mt-1 max-w-sm text-sm text-label-2">
                  {data.members.length === 0
                    ? "Invite your planner or the couple to plan together."
                    : "Nobody matches that search or role. Try widening it."}
                </p>
                {(query || roleFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setRoleFilter("all");
                    }}
                    className="desk-chip mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <ul className="overflow-hidden rounded-3xl border border-hairline bg-white/40 divide-y divide-hairline">
                {visible.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    ownerCount={ownerCount}
                    canManageMembers={data.canManageMembers}
                    canManageOwners={data.canManageOwners}
                    isPending={isPending}
                    onRoleChange={handleRoleChange}
                    onRemove={handleRemove}
                  />
                ))}
              </ul>
            )}
          </section>
        </DeskItem>

        {data.canManageMembers && (
          <DeskItem>
            <PendingInvitesList
              eventId={eventId}
              invites={data.invites}
              canManageMembers={data.canManageMembers}
              onCopied={showToast}
            />
          </DeskItem>
        )}
      </DeskMotion>

      <InviteMemberModal
        eventId={eventId}
        isOpen={isInviteModalOpen}
        canManageOwners={data.canManageOwners}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
}
