import { describe, expect, it } from "vitest";
import {
  admitOffline,
  isExpired,
  offlineStats,
  outcomeOf,
  searchOffline,
  verifyOffline,
  withAdmitted,
  type CheckInSnapshot,
  type QueuedAdmission,
} from "./offline";

const snap: CheckInSnapshot = {
  eventId: "e1",
  takenAt: "2027-01-23T12:00:00Z",
  eventDate: "2027-01-23T14:00:00Z",
  guests: [
    {
      id: "g1",
      name: "Adaèze Okafor",
      code: "ARY-AAAA-1111",
      rsvp: "accepted",
      attending: 3,
      checkedIn: 1,
      table: "Table 05",
      firstCheckedInAt: "2027-01-23T13:00:00Z",
      lastCheckedInAt: "2027-01-23T13:00:00Z",
    },
    {
      id: "g2",
      name: "Tunde Bello",
      code: "ARY-BBBB-2222",
      rsvp: "declined",
      attending: 0,
      checkedIn: 0,
      table: null,
      firstCheckedInAt: null,
      lastCheckedInAt: null,
    },
    {
      id: "g3",
      name: "Kemi Ade",
      code: "ARY-CCCC-3333",
      rsvp: "accepted",
      attending: 1,
      checkedIn: 1,
      table: null,
      firstCheckedInAt: null,
      lastCheckedInAt: null,
    },
  ],
};

describe("verifyOffline", () => {
  it("knows a pass, however it was typed, and says how many are left", () => {
    const r = verifyOffline(snap, [], "  ary-aaaa-1111 ");
    expect(r.status).toBe("verified");
    expect(r.remaining).toBe(2);
    expect(r.table_name).toBe("Table 05");
  });

  it("refuses unknown passes, guests who did not accept, and parties already in", () => {
    expect(verifyOffline(snap, [], "NOPE").status).toBe("unknown_code");
    expect(verifyOffline(snap, [], "").status).toBe("unknown_code");
    expect(verifyOffline(snap, [], "ARY-BBBB-2222").status).toBe(
      "not_attending"
    );
    expect(verifyOffline(snap, [], "ARY-CCCC-3333").status).toBe(
      "already_checked_in"
    );
  });

  it("counts admissions waiting in the queue", () => {
    const q: QueuedAdmission[] = [
      {
        id: "q1",
        code: "ARY-AAAA-1111",
        count: 2,
        guestId: "g1",
        guestName: "Adaèze Okafor",
        at: "2027-01-23T15:00:00Z",
      },
    ];
    const r = verifyOffline(snap, q, "ARY-AAAA-1111");
    expect(r.status).toBe("already_checked_in");
    expect(r.checked_in_count).toBe(3);
    expect(r.last_checked_in_at).toBe("2027-01-23T15:00:00Z");
  });
});

describe("admitOffline", () => {
  it("never lets in more than the party has left", () => {
    const { result, admission } = admitOffline(
      snap,
      [],
      "ARY-AAAA-1111",
      5,
      "t",
      "id1"
    );
    expect(result.status).toBe("checked_in");
    expect(result.admitted_now).toBe(2);
    expect(result.total_checked_in).toBe(3);
    expect(admission).toMatchObject({
      id: "id1",
      count: 2,
      guestId: "g1",
      code: "ARY-AAAA-1111",
    });
  });

  it("queues nothing when nobody can be let in", () => {
    expect(
      admitOffline(snap, [], "ARY-CCCC-3333", 1, "t", "x").admission
    ).toBeNull();
    expect(
      admitOffline(snap, [], "ARY-BBBB-2222", 1, "t", "x").admission
    ).toBeNull();
  });
});

describe("searchOffline", () => {
  it("finds accepted guests by part of their name, accents or not", () => {
    expect(searchOffline(snap, [], "adae").map((m) => m.guest_id)).toEqual([
      "g1",
    ]);
    expect(searchOffline(snap, [], "bello")).toEqual([]);
    expect(searchOffline(snap, [], "a")).toEqual([]);
  });
});

describe("offlineStats", () => {
  it("adds the queue to the people already in", () => {
    const q: QueuedAdmission[] = [
      {
        id: "q1",
        code: "ARY-AAAA-1111",
        count: 1,
        guestId: "g1",
        guestName: "A",
        at: "t",
      },
    ];
    expect(offlineStats(snap, q)).toEqual({
      totalExpected: 4,
      checkedIn: 3,
      remaining: 1,
      attendanceRate: 75,
    });
  });
});

describe("isExpired", () => {
  it("keeps the copy until two days after the celebration", () => {
    expect(isExpired(snap, Date.parse("2027-01-24T14:00:00Z"))).toBe(false);
    expect(isExpired(snap, Date.parse("2027-01-26T14:00:01Z"))).toBe(true);
    expect(isExpired({ ...snap, eventDate: null }, Date.now())).toBe(false);
  });
});

describe("outcomeOf", () => {
  const a: QueuedAdmission = {
    id: "q",
    code: "C",
    count: 2,
    guestId: "g",
    guestName: "N",
    at: "t",
  };
  it("tells a full admission from one another phone beat, and a refusal", () => {
    expect(
      outcomeOf(a, { status: "checked_in", message: "", admitted_now: 2 }).kind
    ).toBe("admitted");
    expect(
      outcomeOf(a, { status: "checked_in", message: "", admitted_now: 1 })
    ).toMatchObject({ kind: "already_in", admittedByServer: 1 });
    expect(
      outcomeOf(a, { status: "already_checked_in", message: "" }).kind
    ).toBe("already_in");
    expect(
      outcomeOf(a, { status: "not_attending", message: "No" })
    ).toMatchObject({ kind: "refused", reason: "No" });
  });
});

describe("withAdmitted", () => {
  it("moves one guest's count at once, never past their party", () => {
    const next = withAdmitted(snap, "g1", 5, "2027-01-23T16:00:00Z");
    const g = next.guests.find((x) => x.id === "g1")!;
    expect(g.checkedIn).toBe(3);
    expect(g.lastCheckedInAt).toBe("2027-01-23T16:00:00Z");
    expect(next.guests.find((x) => x.id === "g3")!.checkedIn).toBe(1);
  });
});
