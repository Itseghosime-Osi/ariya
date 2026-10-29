"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { TeamMemberList } from "@/features/team/components/TeamMemberList";
import { PendingInvitesList } from "@/features/team/components/PendingInvitesList";
import { InviteMemberModal } from "@/features/team/components/InviteMemberModal";
import type { TeamDeskData } from "@/features/team/types";

interface TeamPageClientProps {
  eventId: string;
  data: TeamDeskData;
}

export function TeamPageClient({ eventId, data }: TeamPageClientProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold text-night">
            Active Members ({data.members.length})
          </h2>
          <p className="text-xs text-on-surface-variant">
            Your role:{" "}
            <span className="font-semibold capitalize text-wine">
              {data.currentUserRole}
            </span>
          </p>
        </div>

        {data.canManageMembers && (
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-wine text-ivory text-sm font-semibold hover:bg-wine/90 transition-all flex items-center gap-2 shadow-sm"
          >
            <Icon name="diversity_3" className="text-base" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      <TeamMemberList
        eventId={eventId}
        members={data.members}
        currentUserRole={data.currentUserRole}
        canManageMembers={data.canManageMembers}
        canManageOwners={data.canManageOwners}
      />

      <PendingInvitesList eventId={eventId} invites={data.invites} />

      <InviteMemberModal
        eventId={eventId}
        isOpen={isInviteModalOpen}
        canManageOwners={data.canManageOwners}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
}
