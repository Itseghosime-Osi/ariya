import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

interface InvitationQuotaBannerProps {
  eventId: string;
  isPaid: boolean;
  invitedCount: number;
}

export function InvitationQuotaBanner({
  eventId,
  isPaid,
  invitedCount,
}: InvitationQuotaBannerProps) {
  if (isPaid) return null;

  const remaining = Math.max(0, 20 - invitedCount);

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950">
      <div className="flex items-start gap-3">
        <Icon name="error" className="text-amber-600 text-xl shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-sm">
            Free Tier Quota: {invitedCount} / 20 Invitations Sent
          </div>
          <p className="text-xs text-amber-900/80">
            {remaining > 0
              ? `You have ${remaining} free invitation${remaining === 1 ? "" : "s"} remaining before a celebration pass is required.`
              : "Free tier capacity reached. Unlock unlimited guest invitations & reminders with celebration pass."}
          </p>
        </div>
      </div>

      <Link
        href={`/events/${eventId}/billing`}
        className="px-4 py-2 rounded-xl bg-amber-500 text-night font-semibold text-xs hover:bg-amber-400 transition-all self-start sm:self-center shrink-0 shadow-sm"
      >
        Upgrade Celebration Pass
      </Link>
    </div>
  );
}
