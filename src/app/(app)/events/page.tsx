import React from "react";
import { EventsHome } from "@/features/events/components/CelebrationsList";
import { getUserEvents } from "@/features/events/queries";
import { getCrossEventHomeData } from "@/features/events/data/get-coming-up";
import { partitionEvents } from "@/features/events/lib/select-events";
import { buildComingUp } from "@/features/events/lib/coming-up";
import { buildNeedsAttention } from "@/features/events/lib/needs-attention";
import { getCurrentProfile, getCurrentUser } from "@/features/auth/queries";

export const metadata = {
  title: "Your events • Àríyá",
  description: "Manage your upcoming and past celebrations on Àríyá.",
};

function extractFirstName(
  fullName?: string | null,
  email?: string | null
): string | null {
  if (fullName?.trim()) {
    const first = fullName.trim().split(/\s+/)[0];
    if (first && !/^user$/i.test(first)) {
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
  }
  if (email?.trim()) {
    const local = email.trim().split("@")[0]?.trim();
    if (local && !/^user(_\d+)?$/i.test(local)) {
      const clean = local.split(/[._+-]/)[0] || local;
      if (clean && !/^user$/i.test(clean)) {
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      }
    }
  }
  return null;
}

export default async function EventsPage() {
  const [events, user, profile] = await Promise.all([
    getUserEvents(),
    getCurrentUser(),
    getCurrentProfile(),
  ]);

  const { upcoming } = partitionEvents(events);

  const { vendorTasks, invitedCountByEventId, recentReplies } =
    await getCrossEventHomeData(events);

  const comingUpItems = buildComingUp({
    upcomingEvents: upcoming,
    vendorTasks,
    windowDays: 21,
  });

  const needsAttentionItems = buildNeedsAttention(upcoming, {
    invitedCountByEventId,
  });

  const metaFullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const firstName = extractFirstName(
    profile?.full_name ?? metaFullName,
    profile?.email ?? user?.email
  );

  return (
    <>
      <EventsHome
        events={events}
        comingUpItems={comingUpItems}
        needsAttentionItems={needsAttentionItems}
        recentReplies={recentReplies}
        firstName={firstName}
      />
    </>
  );
}
