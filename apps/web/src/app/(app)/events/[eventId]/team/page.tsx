import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventById } from "@/features/events/queries";
import { getTeamDeskData } from "@/features/team/queries";
import { TeamDesk } from "@/features/team/components/TeamDesk";

export const metadata: Metadata = {
  title: "Team & Roles • Àríyá Celebration Suite",
  description:
    "Collaborative event planning, role-based access, and invitations",
};

interface TeamPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { eventId } = await params;
  const [data, eventData] = await Promise.all([
    getTeamDeskData(eventId),
    getEventById(eventId),
  ]);

  if (!data) {
    notFound();
  }

  const eventTitle =
    eventData?.event.couple?.trim() || eventData?.event.title || "Celebration";

  return <TeamDesk eventId={eventId} eventTitle={eventTitle} data={data} />;
}
