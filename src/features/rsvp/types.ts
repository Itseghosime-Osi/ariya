export interface InvitationGuest {
  id: string;
  first_name: string;
  display_name: string;
  party_size: number;
  plus_ones_allowed: boolean;
}

export interface InvitationRsvp {
  status: "pending" | "accepted" | "declined";
  attending_count: number;
  plus_one_name: string | null;
  dietary: string | null;
  note: string | null;
  responded_at: string | null;
}

export interface InvitationEvent {
  id: string;
  title: string;
  couple: string;
  date: string;
  venue: string;
  area: string | null;
  dress_code: string | null;
  rsvp_by: string | null;
  status: string;
  invitation_theme?: string | null;
  invitation_headline?: string | null;
  invitation_subheadline?: string | null;
  invitation_message?: string | null;
}

export interface InvitationData {
  guest: InvitationGuest;
  rsvp: InvitationRsvp | null;
  event: InvitationEvent;
  table_name: string | null;
}

export type RsvpViewMode =
  | "invalid_link"
  | "closed"
  | "deadline_passed"
  | "already_replied"
  | "active"
  | "revise";
