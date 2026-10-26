import type { Database } from "@/lib/supabase/database.types";

export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
export type EventUpdate = Database["public"]["Tables"]["events"]["Update"];
export type EventMember = Database["public"]["Tables"]["event_members"]["Row"];

export interface EventMetrics {
  totalParties: number;
  totalAttendees: number;
  acceptedParties: number;
  acceptedGuests: number;
  awaitingParties: number;
  awaitingGuests: number;
  declinedParties: number;
  declinedGuests: number;
  seatedGuests: number;
  unassignedGuests: number;
  asoEbiRequests: number;
  readinessPercentage: number;
  daysAway: number;
}

export interface EventWithMetrics {
  event: Event;
  role: "owner" | "planner" | "couple" | "staff";
  metrics: EventMetrics;
}

export interface MilestoneItem {
  id: string;
  title: string;
  description: string;
  category: "Tasting" | "Floristry" | "Cutoff" | "Seating" | "Vendor";
  dueDate: string;
  daysAway: number;
  eventTitle: string;
}

export interface RecentGuestResponse {
  id: string;
  guestName: string;
  initials: string;
  side: string;
  groupName: string | null;
  status: "accepted" | "declined" | "pending";
  attendingCount: number;
  tableName: string | null;
  timeAgo: string;
}
