import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { DeskPageHeader } from "@/components/ui/desk-page-header";
import { getCurrentUser } from "@/features/auth/queries";
import { getArchivedEvents } from "@/features/events/queries";
import { ArchiveDesk } from "@/features/events/components/ArchiveDesk";
import { isEventExpired } from "@/lib/event-expiry";

export const metadata: Metadata = {
  title: "Archive • Àríyá",
  description: "Celebrations you have filed away.",
};

export default async function ArchivePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fprofile%2Farchive");

  const archived = await getArchivedEvents();
  const items = archived.map(({ event, role, metrics }) => ({
    id: event.id,
    title: event.title,
    couple: event.couple,
    date: event.date,
    ended: isEventExpired(event.date),
    canDelete: role === "owner",
    guests: metrics.totalAttendees,
  }));

  return (
    <div className="space-y-4 sm:space-y-6 sm:pb-16 lg:space-y-8">
      <ScreenHeader
        title="Archive"
        subtitle={`${items.length} ${items.length === 1 ? "celebration" : "celebrations"}`}
        backHref="/profile"
      />
      <div className="standalone:max-md:hidden">
        <DeskPageHeader
          compact
          eyebrow="Your account"
          title="Archive"
          description="Celebrations you have filed away. They no longer appear in your celebrations. Restore one to bring it back, or delete it for good."
        />
      </div>
      <ArchiveDesk items={items} />
    </div>
  );
}
