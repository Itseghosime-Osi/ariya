import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { accountInitials } from "@/components/layout/nav-items";
import { getCurrentProfile, getCurrentUser } from "@/features/auth/queries";
import { countPendingProposals } from "@/features/approvals/queries";
import { getUserEvents } from "@/features/events/queries";
import { SettingsDesk } from "@/features/settings/components/SettingsDesk";
import { getNotificationPreferences } from "@/features/notifications/preferences";
import { clientEnv } from "@/lib/env/client";

export const metadata: Metadata = {
  title: "Settings • Àríyá",
  description: "Notifications, security and how Àríyá behaves on this device.",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fsettings");
  const [profile, events, pendingApprovals, digestPreferences] =
    await Promise.all([
      getCurrentProfile(),
      getUserEvents(),
      countPendingProposals(),
      getNotificationPreferences(),
    ]);

  const email = profile?.email ?? user.email ?? "";
  const name =
    profile?.full_name ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null) ||
    email;
  const since = new Date(
    profile?.created_at ?? user.created_at
  ).toLocaleDateString("en-NG", { year: "numeric", timeZone: "Africa/Lagos" });

  return (
    <SettingsDesk
      account={{ name, email, initials: accountInitials(email), since }}
      events={events.map(({ event, role }) => ({
        id: event.id,
        title: event.title,
        couple: event.couple,
        date: event.date,
        role,
      }))}
      guestCount={events.reduce(
        (n, e) => n + (e.metrics.totalAttendees || 0),
        0
      )}
      pendingApprovals={pendingApprovals}
      publicKey={clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
      digestPreferences={digestPreferences}
    />
  );
}
