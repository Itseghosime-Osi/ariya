import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTeamDeskData } from "@/features/team/queries";
import { TeamPageClient } from "./TeamPageClient";

export const metadata: Metadata = {
  title: "Team & Roles • Àríyá Celebration Suite",
  description:
    "Collaborative event orchestration, role-based access, and invitations",
};

interface TeamPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { eventId } = await params;
  const data = await getTeamDeskData(eventId);

  if (!data) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-wine font-semibold text-xs uppercase tracking-wider">
          <span>V2 17</span>
          <span>•</span>
          <span>Celebration Suite</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-night">
          Team & Collaboration Roles
        </h1>
        <p className="text-sm text-on-surface-variant max-w-2xl">
          Coordinate with co-planners, the celebrant couple, and on-the-day
          concierge staff with strict Nigerian wedding role hierarchy.
        </p>
      </div>

      <TeamPageClient eventId={eventId} data={data} />
    </div>
  );
}
