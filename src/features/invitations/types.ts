export type InvitationTheme =
  "royal_gold" | "emerald_regal" | "sunset_asoebi" | "monochrome_velvet";

export interface InvitationDesign {
  theme: InvitationTheme;
  headline: string;
  subheadline: string;
  attireNote?: string;
  customMessage?: string;
}

export interface InvitationGuest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  side: string | null;
  groupName: string | null;
  partySize: number;
  displaySeats: number;
  isVip: boolean;
  rsvpToken: string;
  invitedAt: string | null;
  rsvpStatus: "pending" | "accepted" | "declined";
}

export interface InvitationDeskData {
  eventId: string;
  eventTitle: string;
  coupleName: string;
  eventDate: string;
  venueName: string;
  isPaid: boolean;
  totalGuests: number;
  invitedGuestsCount: number;
  uninvitedGuestsCount: number;
  guests: InvitationGuest[];
  design: InvitationDesign;
}
