/**
 * The check-in desk without a signal.
 *
 * When the desk opens with a signal it keeps a copy of the guest list on the phone: each guest's
 * name, pass code, reply, party size, table and how many of the party are already in. If the
 * network then drops, the desk answers from that copy with the same rules as the server's
 * verify_check_in and check_in, and keeps every admission in a queue on the phone. When the signal
 * returns the queue is sent to the server in order. The server still decides: it caps every
 * admission at the party size, so two phones that both let a guest in while offline cannot count
 * them twice.
 *
 * Everything here is plain data in, plain data out, so it can be tested without a browser.
 */
import type { CheckInMatch, CheckInResult, CheckInStats } from "./types";

export interface OfflineGuest {
  id: string;
  name: string;
  /** The pass code, upper case. */
  code: string;
  /** The guest's reply: only "accepted" can be admitted. */
  rsvp: string;
  /** People in the party who said they are coming. */
  attending: number;
  /** People already admitted when the copy was taken. */
  checkedIn: number;
  table: string | null;
  firstCheckedInAt: string | null;
  lastCheckedInAt: string | null;
}

export interface CheckInSnapshot {
  eventId: string;
  /** When the copy was taken (ISO). */
  takenAt: string;
  /** The celebration's date (ISO), so the copy can be wiped once it is over. */
  eventDate: string | null;
  guests: OfflineGuest[];
}

/** One admission made without a signal, waiting to be sent. */
export interface QueuedAdmission {
  /** A local id, so a sent admission is removed exactly once. */
  id: string;
  code: string;
  count: number;
  guestId: string;
  guestName: string;
  /** When the door staff tapped Admit (ISO). */
  at: string;
}

/** Days after the celebration that a copy of its guest list is kept on the phone. */
export const KEEP_DAYS_AFTER = 2;

export function normaliseCode(code: string): string {
  return code.trim().toUpperCase();
}

/** True once the celebration is far enough behind us that the copy should be wiped. */
export function isExpired(snapshot: CheckInSnapshot, now: number): boolean {
  if (!snapshot.eventDate) return false;
  const end =
    new Date(snapshot.eventDate).getTime() + KEEP_DAYS_AFTER * 86_400_000;
  return Number.isFinite(end) && now > end;
}

/** Everyone admitted for one guest: those in when the copy was taken, plus the queue. */
export function admittedFor(
  guest: OfflineGuest,
  queue: QueuedAdmission[]
): number {
  return (
    guest.checkedIn +
    queue
      .filter((q) => q.guestId === guest.id)
      .reduce((sum, q) => sum + q.count, 0)
  );
}

function lastQueuedAt(guest: OfflineGuest, queue: QueuedAdmission[]) {
  const mine = queue.filter((q) => q.guestId === guest.id);
  return mine.length ? mine[mine.length - 1].at : null;
}

/** Look a pass up, as verify_check_in does. Nobody is admitted. */
export function verifyOffline(
  snapshot: CheckInSnapshot,
  queue: QueuedAdmission[],
  rawCode: string
): CheckInResult {
  const code = normaliseCode(rawCode);
  if (!code) {
    return {
      status: "unknown_code",
      message: "Please enter a valid check-in code",
    };
  }
  const guest = snapshot.guests.find((g) => g.code === code);
  if (!guest) {
    // Not on this phone's copy: a pass for another celebration, or a typo. The server tells them
    // apart once the signal is back.
    return {
      status: "unknown_code",
      message: "Check-in code not recognized",
    };
  }
  if (guest.rsvp !== "accepted") {
    return {
      status: "not_attending",
      message: "Guest RSVP is not confirmed as accepted",
      guest_name: guest.name,
      rsvp_status: guest.rsvp || "pending",
    };
  }
  const inSoFar = admittedFor(guest, queue);
  const full = inSoFar >= guest.attending;
  return {
    status: full ? "already_checked_in" : "verified",
    message: full
      ? "Guest party has already fully checked in"
      : "Verified invitation",
    guest_name: guest.name,
    guest_id: guest.id,
    attending_count: guest.attending,
    checked_in_count: inSoFar,
    remaining: Math.max(guest.attending - inSoFar, 0),
    table_name: guest.table,
    first_checked_in_at: guest.firstCheckedInAt ?? queueFirst(guest, queue),
    last_checked_in_at: lastQueuedAt(guest, queue) ?? guest.lastCheckedInAt,
  };
}

function queueFirst(guest: OfflineGuest, queue: QueuedAdmission[]) {
  return queue.find((q) => q.guestId === guest.id)?.at ?? null;
}

/**
 * Admit, as check_in does: never more than the party has left. Returns the result to show and the
 * admission to queue (none when nobody was let in).
 */
export function admitOffline(
  snapshot: CheckInSnapshot,
  queue: QueuedAdmission[],
  rawCode: string,
  count: number,
  at: string,
  id: string
): { result: CheckInResult; admission: QueuedAdmission | null } {
  const looked = verifyOffline(snapshot, queue, rawCode);
  if (looked.status !== "verified") return { result: looked, admission: null };
  const guest = snapshot.guests.find((g) => g.code === normaliseCode(rawCode))!;
  const inSoFar = admittedFor(guest, queue);
  const asked = Math.max(1, Math.floor(count) || 1);
  const admit = Math.min(asked, guest.attending - inSoFar);
  const admission: QueuedAdmission = {
    id,
    code: guest.code,
    count: admit,
    guestId: guest.id,
    guestName: guest.name,
    at,
  };
  return {
    result: {
      status: "checked_in",
      message: "Guest admitted. It will be sent when the signal is back.",
      guest_name: guest.name,
      guest_id: guest.id,
      admitted_now: admit,
      total_checked_in: inSoFar + admit,
      attending_count: guest.attending,
      table_name: guest.table,
    },
    admission,
  };
}

function fold(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Find accepted guests by part of their name, as search_check_in_guests does. */
export function searchOffline(
  snapshot: CheckInSnapshot,
  queue: QueuedAdmission[],
  query: string
): CheckInMatch[] {
  const q = fold(query.trim());
  if (q.length < 2) return [];
  return snapshot.guests
    .filter((g) => g.rsvp === "accepted" && fold(g.name).includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8)
    .map((g) => ({
      guest_id: g.id,
      guest_name: g.name,
      attending_count: g.attending,
      checked_in_count: admittedFor(g, queue),
      table_name: g.table,
      code: g.code,
    }));
}

/** The desk's numbers from the copy and the queue. */
export function offlineStats(
  snapshot: CheckInSnapshot,
  queue: QueuedAdmission[]
): CheckInStats {
  const accepted = snapshot.guests.filter((g) => g.rsvp === "accepted");
  const totalExpected = accepted.reduce((s, g) => s + g.attending, 0);
  const checkedIn = accepted.reduce(
    (s, g) => s + Math.min(g.attending, admittedFor(g, queue)),
    0
  );
  return {
    totalExpected,
    checkedIn,
    remaining: Math.max(0, totalExpected - checkedIn),
    attendanceRate:
      totalExpected > 0
        ? Math.min(100, Math.round((checkedIn / totalExpected) * 100))
        : 0,
  };
}

/** What a sent admission came back as, for the desk to report. */
export type SyncOutcome =
  /** The server let them in, as many as were queued. */
  | { kind: "admitted"; admission: QueuedAdmission }
  /** The server let fewer in, or none: another phone got there first. */
  | {
      kind: "already_in";
      admission: QueuedAdmission;
      admittedByServer: number;
    }
  /** The server refused it outright (the pass was cancelled, the reply changed). */
  | { kind: "refused"; admission: QueuedAdmission; reason: string };

/** Turn the server's answer to one queued admission into what the desk tells the door staff. */
export function outcomeOf(
  admission: QueuedAdmission,
  result: CheckInResult
): SyncOutcome {
  if (result.status === "checked_in") {
    const n = result.admitted_now ?? admission.count;
    return n >= admission.count
      ? { kind: "admitted", admission }
      : { kind: "already_in", admission, admittedByServer: n };
  }
  if (result.status === "already_checked_in")
    return { kind: "already_in", admission, admittedByServer: 0 };
  return { kind: "refused", admission, reason: result.message };
}

/** The copy after the server admitted `count` of a guest's party: so the desk's numbers move at once. */
export function withAdmitted(
  snapshot: CheckInSnapshot,
  guestId: string,
  count: number,
  at: string
): CheckInSnapshot {
  return {
    ...snapshot,
    guests: snapshot.guests.map((g) =>
      g.id === guestId
        ? {
            ...g,
            checkedIn: Math.min(g.attending, g.checkedIn + count),
            firstCheckedInAt: g.firstCheckedInAt ?? at,
            lastCheckedInAt: at,
          }
        : g
    ),
  };
}
