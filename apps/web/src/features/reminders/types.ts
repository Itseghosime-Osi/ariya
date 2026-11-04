export type ReminderFilter = "awaiting" | "no_email" | "all";

export interface ReminderRecipient {
  guestId: string;
  name: string;
  email: string | null;
  phone: string | null;
  partySize: number;
  rsvpStatus: "pending" | "accepted" | "declined";
  lastSentAt: string | null;
  isEligibleForEmail: boolean;
}

export interface ReminderDeskData {
  eventId: string;
  eventTitle: string;
  coupleName: string;
  eventDate: string;
  venueName: string;
  isPaid: boolean;
  totalGuests: number;
  awaitingCount: number;
  recipients: ReminderRecipient[];
}
