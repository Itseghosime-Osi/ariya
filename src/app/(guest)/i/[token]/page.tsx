import React from "react";
import type { Metadata } from "next";
import { getInvitationByToken, getCheckInCode } from "@/features/rsvp/queries";
import { generateQrDataUrl } from "@/lib/qrcode";
import { InvalidLinkCard } from "@/features/rsvp/components/InvalidLinkCard";
import { ClosedEventCard } from "@/features/rsvp/components/ClosedEventCard";
import { DeadlinePassedCard } from "@/features/rsvp/components/DeadlinePassedCard";
import { RsvpSummaryCard } from "@/features/rsvp/components/RsvpSummaryCard";
import { RsvpInteractiveForm } from "@/features/rsvp/components/RsvpInteractiveForm";

interface GuestInvitationPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ revise?: string }>;
}

export async function generateMetadata({
  params,
}: GuestInvitationPageProps): Promise<Metadata> {
  const { token } = await params;
  const result = await getInvitationByToken(token);

  if (!result.data) {
    return { title: "Invitation Pass • Àríyá" };
  }

  return {
    title: `Invitation for ${result.data.guest.display_name} • ${result.data.event.title} • Àríyá`,
    description: `Official celebration pass and RSVP confirmation for ${result.data.guest.display_name}.`,
  };
}

export default async function GuestInvitationPage({
  params,
  searchParams,
}: GuestInvitationPageProps) {
  const { token } = await params;
  const { revise } = await searchParams;
  const isRevise = revise === "true";

  const { data, state } = await getInvitationByToken(token, isRevise);

  let checkInCode: string | null = null;
  let qrCodeUrl: string | null = null;

  if (state === "already_replied" && data?.rsvp?.status === "accepted") {
    checkInCode = await getCheckInCode(token);
    if (checkInCode) {
      qrCodeUrl = await generateQrDataUrl(checkInCode);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between py-10 px-4 sm:px-6">
      <main className="max-w-xl mx-auto w-full space-y-6">
        {/* Monogram Seal Header */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-wine text-gold shadow-md">
            <span className="font-serif text-xl font-bold tracking-wider">
              À
            </span>
          </div>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-wine/80">
            Personal Celebration Pass
          </p>
        </header>

        {/* State Selection */}
        {state === "invalid_link" && <InvalidLinkCard />}

        {state === "closed" && data && <ClosedEventCard event={data.event} />}

        {state === "deadline_passed" && data && (
          <DeadlinePassedCard event={data.event} guest={data.guest} />
        )}

        {state === "already_replied" && data && (
          <RsvpSummaryCard
            data={data}
            token={token}
            checkInCode={checkInCode}
            qrCodeUrl={qrCodeUrl}
          />
        )}

        {(state === "active" || state === "revise") && data && (
          <RsvpInteractiveForm
            data={data}
            token={token}
            isRevise={state === "revise"}
          />
        )}
      </main>

      <footer className="text-center text-xs text-stone-700 font-medium pt-8">
        <p>Àríyá • Celebration Planning &amp; Guest Management</p>
      </footer>
    </div>
  );
}
