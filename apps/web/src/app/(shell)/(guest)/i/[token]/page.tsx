import React from "react";
import type { Metadata } from "next";
import {
  getInvitationByToken,
  getCheckInCode,
  getRsvpForm,
} from "@/features/rsvp/queries";
import { generateQrDataUrl } from "@/lib/qrcode";
import { getGuestTheme } from "@/features/rsvp/themes";
import { InvalidLinkCard } from "@/features/rsvp/components/InvalidLinkCard";
import { FilmGate } from "@/features/event-film/FilmGate";
import { FilmFinale } from "@/features/event-film/components/FilmFinale";
import { NotLiveCard } from "@/features/event-film/components/NotLiveCard";
import { TestModeBanner } from "@/features/event-film/components/TestModeBanner";
import {
  designFromEvent,
  ensureEntrySeal,
} from "@/features/invitations/design";
import { readFilmDesign } from "@/features/event-film/design";
import { isEventTeamMember } from "@/features/event-film/queries";
import { inviteAccess } from "@/features/event-film/visibility";
import { ExpiredEventCard } from "@/features/events/components/ExpiredEventCard";
import { ClosedEventCard } from "@/features/rsvp/components/ClosedEventCard";
import { DeadlinePassedCard } from "@/features/rsvp/components/DeadlinePassedCard";
import { RsvpSummaryCard } from "@/features/rsvp/components/RsvpSummaryCard";
import { RsvpInteractiveForm } from "@/features/rsvp/components/RsvpInteractiveForm";

interface GuestInvitationPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ revise?: string }>;
}

// Personal names and event details must not be exposed in link previews or search results.
export const metadata: Metadata = {
  title: "Invitation Pass • Àríyá",
  description: "Open your personal invitation to view the details and RSVP.",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

export default async function GuestInvitationPage({
  params,
  searchParams,
}: GuestInvitationPageProps) {
  const { token } = await params;
  const { revise } = await searchParams;
  const isRevise = revise === "true";

  const { data, state } = await getInvitationByToken(token, isRevise);

  const rsvpForm = await getRsvpForm(token);
  let checkInCode: string | null = null;
  let qrCodeUrl: string | null = null;

  if (state === "already_replied" && data?.rsvp?.status === "accepted") {
    checkInCode = await getCheckInCode(token);
    if (checkInCode) {
      qrCodeUrl = await generateQrDataUrl(checkInCode);
    }
  }

  const savedDesign = data
    ? designFromEvent({
        title: data.event.title,
        couple: data.event.couple,
        date: data.event.date,
        venue: data.event.venue,
        area: data.event.area,
        dressCode: data.event.dress_code,
        rsvpBy: data.event.rsvp_by,
        theme: data.event.invitation_theme ?? null,
        headline: data.event.invitation_headline ?? null,
        subheadline: data.event.invitation_subheadline ?? null,
        message: data.event.invitation_message ?? null,
        design: rsvpForm.invitationDesign,
      })
    : null;
  // With the access pass on, the guest's card carries it: where the host put the entry seal, or in
  // the house spot if they never placed one. Without a pass the card is just the card.
  const sealedDesign =
    rsvpForm.requireAccessCard && checkInCode && savedDesign
      ? ensureEntrySeal(savedDesign)
      : null;

  const theme = getGuestTheme(data?.event?.invitation_theme);

  // In test mode only the celebration's own team can open a personal link, and only to look.
  const live = data?.event.invitation_live !== false;
  const access = data
    ? inviteAccess({
        live,
        isTeamMember: live ? false : await isEventTeamMember(data.event.id),
      })
    : "open";
  const hidden =
    Boolean(data) &&
    access === "not-live" &&
    state !== "expired" &&
    state !== "invalid_link";
  const film = data ? readFilmDesign(data.event.film_design) : null;
  const showFilm =
    Boolean(film?.enabled) &&
    !hidden &&
    (state === "active" || state === "revise" || state === "already_replied");

  return (
    <div className="min-h-screen bg-ivory flex flex-col justify-between py-10 px-4 sm:px-6">
      {showFilm && data && film && (
        <FilmGate
          design={film}
          storageKey={`film:${data.event.id}:${token}`}
          guestName={data.guest.display_name}
          event={{
            couple: data.event.couple,
            title: data.event.title,
            date: data.event.date,
            venue: data.event.venue,
            area: data.event.area,
            dressCode: data.event.dress_code,
          }}
          ctaLabel={
            state === "already_replied"
              ? "See your reply"
              : "Reply to the invitation"
          }
          finale={
            <FilmFinale
              design={sealedDesign ?? rsvpForm.invitationDesign}
              entryCode={rsvpForm.requireAccessCard ? checkInCode : null}
              event={{
                title: data.event.title,
                couple: data.event.couple,
                date: data.event.date,
                venue: data.event.venue,
                area: data.event.area,
                dressCode: data.event.dress_code,
                rsvpBy: data.event.rsvp_by,
                theme: data.event.invitation_theme,
                headline: data.event.invitation_headline,
                subheadline: data.event.invitation_subheadline,
                message: data.event.invitation_message,
              }}
            />
          }
        />
      )}
      <main className="max-w-xl mx-auto w-full space-y-6">
        {/* Monogram Seal Header */}
        <header className="text-center space-y-2">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-xl shadow-md ${theme.seal}`}
          >
            <span className="font-serif text-xl font-bold tracking-wider">
              À
            </span>
          </div>
          <p
            className={`text-[11px] font-semibold tracking-widest uppercase ${theme.subheadline}`}
          >
            Your guest pass
          </p>
        </header>

        {access === "test-preview" && data && (
          <TestModeBanner eventId={data.event.id} />
        )}

        {hidden && data && (
          <NotLiveCard couple={data.event.couple} title={data.event.title} />
        )}

        {/* State Selection */}
        {state === "invalid_link" && <InvalidLinkCard />}

        {state === "expired" && data && (
          <ExpiredEventCard
            title={data.event.title}
            couple={data.event.couple}
          />
        )}

        {state === "closed" && data && !hidden && (
          <ClosedEventCard event={data.event} />
        )}

        {state === "deadline_passed" && data && !hidden && (
          <DeadlinePassedCard event={data.event} guest={data.guest} />
        )}

        {state === "already_replied" && data && !hidden && (
          <RsvpSummaryCard
            data={data}
            token={token}
            checkInCode={checkInCode}
            qrCodeUrl={qrCodeUrl}
            requireAccessCard={rsvpForm.requireAccessCard}
            design={sealedDesign}
            questions={rsvpForm.questions}
            answers={rsvpForm.answers}
          />
        )}

        {(state === "active" || state === "revise") && data && !hidden && (
          <RsvpInteractiveForm
            data={data}
            token={token}
            isRevise={state === "revise"}
            questions={rsvpForm.questions}
            answers={rsvpForm.answers}
          />
        )}
      </main>

      <footer className="text-center text-xs text-stone-700 font-medium pt-8">
        <p>Àríyá • Celebration Planning &amp; Guest Management</p>
      </footer>
    </div>
  );
}
