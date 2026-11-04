import type { InvitationData } from "./types";

/** The notification a host gets when a guest replies. */
export function rsvpPushMessage(
  invitation: InvitationData,
  status: "accepted" | "declined",
  attendingCount: number,
  isRevision: boolean
) {
  const name = invitation.guest.display_name;
  const where = invitation.event.couple || invitation.event.title;
  const seats = `${attendingCount} ${attendingCount === 1 ? "seat" : "seats"}`;
  return {
    title: isRevision
      ? `${name} updated their RSVP`
      : status === "accepted"
        ? `${name} is coming 🎉`
        : `${name} can't make it`,
    body:
      status === "accepted" ? `${seats} for ${where}` : `Declined for ${where}`,
    url: `/events/${invitation.event.id}/guests`,
    tag: `rsvp-${invitation.guest.id}`,
  };
}
