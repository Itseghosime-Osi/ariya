import { describe, expect, it } from "vitest";
import { people, seatingCounts } from "./counts";
import type { SeatingGuest, TableWithGuests } from "./types";

function guest(
  id: string,
  status: SeatingGuest["status"],
  attending: number,
  table_id: string | null = null
): SeatingGuest {
  return {
    id,
    name: id,
    side: "bride",
    group_name: null,
    is_vip: false,
    party_size: attending,
    attending_count: attending,
    status,
    plus_one_name: null,
    dietary: null,
    table_id,
  };
}

function table(
  id: string,
  capacity: number,
  guests: SeatingGuest[]
): TableWithGuests {
  return {
    id,
    name: id,
    capacity,
    guests,
    occupiedSeats: guests.reduce((a, g) => a + g.attending_count, 0),
  } as unknown as TableWithGuests;
}

describe("seatingCounts", () => {
  it("keeps accepted, awaiting and seated apart, in invitations and people", () => {
    const c = seatingCounts({
      tables: [table("t1", 10, [guest("a", "accepted", 3, "t1")])],
      unseatedGuests: [
        guest("b", "accepted", 2),
        guest("c", "pending", 1),
        guest("d", "pending", 4),
      ],
    });
    expect(c.seated).toEqual({ invitations: 1, people: 3 });
    expect(c.toSeat).toEqual({ invitations: 1, people: 2 });
    expect(c.accepted).toEqual({ invitations: 2, people: 5 });
    expect(c.awaiting).toEqual({ invitations: 2, people: 5 });
    expect(c.seats).toBe(10);
    expect(c.expectedPeople).toBe(10);
    expect(c.seatedPct).toBe(60);
  });

  it("says 100% only when every accepted person is seated, whatever is still pending", () => {
    const c = seatingCounts({
      tables: [table("t1", 8, [guest("a", "accepted", 2, "t1")])],
      unseatedGuests: [guest("p", "pending", 5)],
    });
    expect(c.seatedPct).toBe(100);
    expect(c.toSeat.people).toBe(0);
    expect(c.awaiting.people).toBe(5);
  });

  it("never rounds a nearly full hall up to 100%", () => {
    const seated = Array.from({ length: 199 }, (_, i) =>
      guest(`s${i}`, "accepted", 1, "t1")
    );
    const c = seatingCounts({
      tables: [table("t1", 200, seated)],
      unseatedGuests: [guest("x", "accepted", 1)],
    });
    expect(c.seatedPct).toBe(99);
  });

  it("is 0% with nobody accepted yet", () => {
    const c = seatingCounts({
      tables: [],
      unseatedGuests: [guest("p", "pending", 1)],
    });
    expect(c.seatedPct).toBe(0);
    expect(c.accepted.people).toBe(0);
  });

  it("ignores declined guests even if they still hold a seat", () => {
    const c = seatingCounts({
      tables: [table("t1", 4, [guest("d", "declined", 2, "t1")])],
      unseatedGuests: [guest("x", "declined", 1)],
    });
    expect(c.seated.people).toBe(0);
    expect(c.toSeat.people).toBe(0);
  });
});

describe("people", () => {
  it("says person or people", () => {
    expect(people(1)).toBe("1 person");
    expect(people(3)).toBe("3 people");
  });
});
