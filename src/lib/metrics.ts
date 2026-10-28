/**
 * Single source of truth for celebration headcount and party metrics.
 *
 * Rules:
 * - invited parties = guest rows (guests.length)
 * - expected people = sum of attending_count for accepted RSVPs
 * - seated people = sum of party sizes seated (effective headcount of seated parties)
 * - RSVP rate = responded parties / invited parties
 */

export interface MetricRsvp {
  status?: "accepted" | "declined" | "pending" | string | null;
  attending_count?: number | null;
}

export interface MetricSeat {
  id?: string | null;
  table_id?: string | null;
  table_name?: string | null;
}

export interface GuestMetricItem {
  id?: string;
  party_size?: number | null;
  is_vip?: boolean | null;
  seating_conflict_at?: string | null;
  rsvp?: MetricRsvp | null;
  rsvps?: MetricRsvp | MetricRsvp[] | null;
  seat?: MetricSeat | null;
  seat_assignments?: MetricSeat | MetricSeat[] | null;
  table_id?: string | null;
}

export interface CelebrationMetricsSummary {
  invitedParties: number;
  totalParties: number;
  expectedPeople: number;
  acceptedGuests: number; // alias for expectedPeople
  acceptedParties: number;
  declinedParties: number;
  declinedGuests: number;
  awaitingParties: number;
  awaitingGuests: number;
  respondedParties: number;
  rsvpRate: number; // percentage 0 - 100 of responded parties / invited parties
  acceptedPartiesPct: number; // percentage of accepted parties over invited parties
  declinedPartiesPct: number; // percentage of declined parties over invited parties
  awaitingPartiesPct: number; // percentage of awaiting parties over invited parties
  totalAttendees: number; // total invited seats capacity
  seatedPeople: number;
  seatedGuests: number; // alias for seatedPeople
  unassignedPeople: number;
  unassignedGuests: number; // alias for unassignedPeople
  seatedParties: number;
  conflictedParties: number;
  vipParties: number;
}

/**
 * Returns the effective seats for a guest party row.
 * If the guest has an accepted RSVP, displays their confirmed attending count.
 * Otherwise returns the invited party size.
 */
export function getPartyDisplaySeats(
  guest: Pick<GuestMetricItem, "party_size" | "rsvp" | "rsvps">
): number {
  const rsvp = resolveRsvp(guest);
  if (
    rsvp?.status === "accepted" &&
    typeof rsvp.attending_count === "number" &&
    rsvp.attending_count > 0
  ) {
    return rsvp.attending_count;
  }
  return guest.party_size && guest.party_size > 0 ? guest.party_size : 1;
}

function resolveRsvp(
  guest: Pick<GuestMetricItem, "rsvp" | "rsvps">
): MetricRsvp | null {
  if (guest.rsvp) return guest.rsvp;
  if (Array.isArray(guest.rsvps)) return guest.rsvps[0] ?? null;
  if (guest.rsvps) return guest.rsvps;
  return null;
}

function hasSeatAssignment(
  guest: Pick<GuestMetricItem, "seat" | "seat_assignments" | "table_id">
): boolean {
  if (guest.table_id) return true;
  if (guest.seat?.table_id || guest.seat?.table_name) return true;
  if (Array.isArray(guest.seat_assignments)) {
    return guest.seat_assignments.length > 0;
  }
  if (guest.seat_assignments?.id || guest.seat_assignments?.table_id)
    return true;
  return false;
}

/**
 * Computes unified metrics across guests, RSVPs and seating.
 */
export function calculateCelebrationMetrics(
  guests: GuestMetricItem[]
): CelebrationMetricsSummary {
  const invitedParties = guests.length;

  let totalAttendees = 0;
  let acceptedParties = 0;
  let expectedPeople = 0;
  let declinedParties = 0;
  let declinedGuests = 0;
  let awaitingParties = 0;
  let awaitingGuests = 0;
  let seatedPeople = 0;
  let seatedParties = 0;
  let conflictedParties = 0;
  let vipParties = 0;

  for (const g of guests) {
    const partySize = g.party_size && g.party_size > 0 ? g.party_size : 1;
    totalAttendees += partySize;

    if (g.is_vip) vipParties += 1;
    if (g.seating_conflict_at) conflictedParties += 1;

    const rsvp = resolveRsvp(g);
    const status = rsvp?.status ?? "pending";
    const attendingCount =
      typeof rsvp?.attending_count === "number" && rsvp.attending_count > 0
        ? rsvp.attending_count
        : partySize;

    const isSeated = hasSeatAssignment(g);

    if (status === "accepted") {
      acceptedParties += 1;
      expectedPeople += attendingCount;
      if (isSeated) {
        seatedParties += 1;
        seatedPeople += attendingCount;
      }
    } else if (status === "declined") {
      declinedParties += 1;
      declinedGuests += partySize;
    } else {
      awaitingParties += 1;
      awaitingGuests += partySize;
      if (isSeated) {
        seatedParties += 1;
        seatedPeople += partySize;
      }
    }
  }

  const respondedParties = acceptedParties + declinedParties;
  const rsvpRate =
    invitedParties > 0
      ? Math.round((respondedParties / invitedParties) * 100)
      : 0;
  const acceptedPartiesPct =
    invitedParties > 0
      ? Math.round((acceptedParties / invitedParties) * 100)
      : 0;
  const declinedPartiesPct =
    invitedParties > 0
      ? Math.round((declinedParties / invitedParties) * 100)
      : 0;
  const awaitingPartiesPct =
    invitedParties > 0
      ? Math.max(0, 100 - acceptedPartiesPct - declinedPartiesPct)
      : 0;

  const unassignedPeople = Math.max(0, expectedPeople - seatedPeople);

  return {
    invitedParties,
    totalParties: invitedParties,
    expectedPeople,
    acceptedGuests: expectedPeople,
    acceptedParties,
    declinedParties,
    declinedGuests,
    awaitingParties,
    awaitingGuests,
    respondedParties,
    rsvpRate,
    acceptedPartiesPct,
    declinedPartiesPct,
    awaitingPartiesPct,
    totalAttendees,
    seatedPeople,
    seatedGuests: seatedPeople,
    unassignedPeople,
    unassignedGuests: unassignedPeople,
    seatedParties,
    conflictedParties,
    vipParties,
  };
}

/**
 * Formats event card metric string with explicit units:
 * e.g. "3 parties invited · 3 people attending · 67% responded"
 */
export function formatEventCardMetrics(m: {
  totalParties: number;
  acceptedGuests: number;
  rsvpRate: number;
}): string {
  const partyUnit =
    m.totalParties === 1
      ? "1 party invited"
      : `${m.totalParties} parties invited`;
  const peopleUnit =
    m.acceptedGuests === 1
      ? "1 person attending"
      : `${m.acceptedGuests} people attending`;
  const rateUnit = `${m.rsvpRate}% responded`;
  return `${partyUnit} · ${peopleUnit} · ${rateUnit}`;
}
