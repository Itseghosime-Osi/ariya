export type CheckInStatus =
  | "verified"
  | "checked_in"
  | "already_checked_in"
  | "not_attending"
  | "wrong_event"
  | "unknown_code";

export interface CheckInResult {
  status: CheckInStatus;
  message: string;
  guest_name?: string;
  guest_id?: string;
  admitted_now?: number;
  total_checked_in?: number;
  attending_count?: number;
  table_name?: string | null;
  rsvp_status?: string;
  checked_in_count?: number;
  remaining?: number;
  first_checked_in_at?: string | null;
  last_checked_in_at?: string | null;
}

export interface CheckInStats {
  totalExpected: number;
  checkedIn: number;
  remaining: number;
  attendanceRate: number;
}

export interface RecentCheckIn {
  id: string;
  guest_name: string;
  count: number;
  checked_in_at: string;
  table_name: string | null;
}

export interface CheckInDeskData {
  stats: CheckInStats;
  recentCheckIns: RecentCheckIn[];
}

/** One guest the desk found by name. Only guests who have accepted are ever offered. */
export interface CheckInMatch {
  guest_id: string;
  guest_name: string;
  attending_count: number;
  checked_in_count: number;
  table_name: string | null;
  /** The pass code, so choosing a guest continues exactly as a scan does: verify, then Admit. */
  code: string;
}
