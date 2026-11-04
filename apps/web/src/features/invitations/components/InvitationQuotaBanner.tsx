import React from "react";
import Link from "next/link";

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
    <div className="flex flex-col justify-between gap-3 rounded-3xl border border-gold/40 bg-gold/10 p-5 sm:flex-row sm:items-center sm:px-6">
      <div>
        <p className="font-serif text-lg font-bold text-on-surface">
          Free plan: {invitedCount} of 20 invitations used
        </p>
        <p className="text-sm text-on-surface-variant">
          {remaining > 0
            ? `You have ${remaining} free invitation${remaining === 1 ? "" : "s"} left before a celebration pass is needed.`
            : "The free limit is reached. A celebration pass unlocks unlimited invitations and reminders."}
        </p>
      </div>

      <Link
        href={`/events/${eventId}/billing`}
        className="shrink-0 self-start rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-night shadow-sm transition-transform hover:-translate-y-0.5 sm:self-center"
      >
        Upgrade celebration pass
      </Link>
    </div>
  );
}
