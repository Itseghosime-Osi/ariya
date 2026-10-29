import type { Database } from "@/lib/supabase/database.types";
import type { FieldMapping, CsvParseResult } from "./csv-parser";

export type Guest = Database["public"]["Tables"]["guests"]["Row"];
export type GuestInsert = Database["public"]["Tables"]["guests"]["Insert"];
export type GuestUpdate = Database["public"]["Tables"]["guests"]["Update"];

export interface GuestRsvpSummary {
  id?: string;
  status: "accepted" | "declined" | "pending";
  attending_count: number;
  plus_one_name?: string | null;
  dietary?: string | null;
  note?: string | null;
  responded_at?: string | null;
}

export interface GuestSeatSummary {
  table_id?: string;
  table_name?: string | null;
}

export interface GuestWithRsvpAndSeat extends Guest {
  rsvp?: GuestRsvpSummary | null;
  seat?: GuestSeatSummary | null;
}

export type GuestWithDetails = GuestWithRsvpAndSeat;

export interface GuestFilterState {
  search?: string;
  side?:
    | "all"
    | "groom"
    | "bride"
    | "family"
    | "vip"
    | "planner"
    | "mutual"
    | string;
  group?: "all" | string;
  rsvpStatus?: "all" | "accepted" | "declined" | "pending";
  seatedStatus?: "all" | "seated" | "unseated";
  isVip?: boolean | null;
  page?: number;
  pageSize?: number;
}

export interface GuestListResponse {
  guests: GuestWithRsvpAndSeat[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GuestOverviewStats {
  totalCount: number;
  totalAttendees: number;
  acceptedCount: number;
  acceptedGuests: number;
  pendingCount: number;
  declinedCount: number;
  declinedGuests: number;
  seatedCount: number;
  unassignedCount: number;
  vipCount: number;
}

export type { FieldMapping, CsvParseResult };
export type CsvColumnMapping = FieldMapping;
export type CsvValidationResult = CsvParseResult;
