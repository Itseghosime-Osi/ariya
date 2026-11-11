import type { SeatingDeskData } from "./types";

/**
 * Every number the seating screens show, worked out in one place so they can never disagree.
 *
 * Two words, used the same way everywhere:
 * - **invitations**: guest records (one per name on the list).
 * - **people**: who actually comes, counting party size.
 *
 * Only guests who accepted can take a seat. Pending replies are counted separately, as people the
 * hall should be ready for, never as people "waiting for a seat". Declined guests never reach here.
 */
export interface SeatingCounts {
  accepted: { invitations: number; people: number };
  seated: { invitations: number; people: number };
  /** Accepted, but not at a table yet. */
  toSeat: { invitations: number; people: number };
  /** No reply yet: they cannot be seated until they accept. */
  awaiting: { invitations: number; people: number };
  /** Chairs at every table. */
  seats: number;
  /** Share of accepted people who have a seat. 100 only when every accepted person is seated. */
  seatedPct: number;
  /** People the hall should be ready for: accepted plus replies still awaited. */
  expectedPeople: number;
}

export function seatingCounts(
  data: Pick<SeatingDeskData, "tables" | "unseatedGuests">
): SeatingCounts {
  const seated = { invitations: 0, people: 0 };
  const toSeat = { invitations: 0, people: 0 };
  const awaiting = { invitations: 0, people: 0 };
  let seats = 0;

  for (const t of data.tables) {
    seats += t.capacity;
    for (const g of t.guests) {
      if (g.status === "declined") continue;
      seated.invitations += 1;
      seated.people += g.attending_count;
    }
  }
  for (const g of data.unseatedGuests) {
    if (g.status === "accepted") {
      toSeat.invitations += 1;
      toSeat.people += g.attending_count;
    } else if (g.status === "pending") {
      awaiting.invitations += 1;
      awaiting.people += g.attending_count;
    }
  }

  const accepted = {
    invitations: seated.invitations + toSeat.invitations,
    people: seated.people + toSeat.people,
  };
  const seatedPct =
    accepted.people === 0
      ? 0
      : toSeat.people === 0
        ? 100
        : Math.min(99, Math.floor((seated.people / accepted.people) * 100));

  return {
    accepted,
    seated,
    toSeat,
    awaiting,
    seats,
    seatedPct,
    expectedPeople: accepted.people + awaiting.people,
  };
}

/** "1 person" / "3 people". */
export function people(n: number) {
  return `${n} ${n === 1 ? "person" : "people"}`;
}
