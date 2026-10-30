import { describe, expect, it } from "vitest";
import type { EventWithMetrics } from "../types";
import { partitionEvents, pickHeroEvent, sortUpcoming } from "./select-events";

function makeEvent(
  overrides: Partial<EventWithMetrics["event"]> & { id: string }
): EventWithMetrics {
  return {
    event: {
      id: overrides.id,
      slug: overrides.slug ?? `slug-${overrides.id}`,
      title: overrides.title ?? `Event ${overrides.id}`,
      couple: overrides.couple ?? "Ọlá & Adéṣọlá",
      date: overrides.date ?? "2026-12-12T13:00:00Z",
      rsvp_by: overrides.rsvp_by ?? null,
      venue: overrides.venue ?? "Eko Hotel, Victoria Island",
      area: overrides.area ?? "Victoria Island, Lagos",
      dress_code: overrides.dress_code ?? null,
      hall_layout: null,
      description: overrides.description ?? null,
      cover_image_url: overrides.cover_image_url ?? null,
      is_public: overrides.is_public ?? false,
      paid_at: overrides.paid_at ?? null,
      registry_code: overrides.registry_code ?? null,
      schedule: overrides.schedule ?? null,
      invitation_headline: null,
      invitation_message: null,
      invitation_subheadline: null,
      invitation_theme: null,
      status: overrides.status ?? "active",
      created_at: overrides.created_at ?? "2026-01-01T00:00:00Z",
      updated_at: overrides.updated_at ?? "2026-01-01T00:00:00Z",
    },
    role: "owner",
    metrics: {
      totalParties: 10,
      totalAttendees: 20,
      acceptedParties: 5,
      acceptedGuests: 10,
      awaitingParties: 4,
      awaitingGuests: 8,
      declinedParties: 1,
      declinedGuests: 2,
      seatedGuests: 6,
      unassignedGuests: 4,
      readinessPercentage: 50,
      daysAway: 10,
      acceptedPartiesPct: 50,
      declinedPartiesPct: 10,
      awaitingPartiesPct: 40,
      rsvpRate: 60,
    },
  };
}

describe("select-events", () => {
  it("partitions upcoming vs past across the Lagos midnight boundary (23:30 UTC is 00:30 WAT next day)", () => {
    // At 2026-11-10T23:30:00Z, it is already 2026-11-11 00:30 WAT in Lagos.
    const nowUtc = "2026-11-10T23:30:00Z";

    // Event on 2026-11-10 18:00 UTC (19:00 WAT on Nov 10) -> Yesterday in Lagos -> Past
    const nov10Evening = makeEvent({
      id: "nov-10",
      date: "2026-11-10T18:00:00Z",
    });

    // Event on 2026-11-10 23:15 UTC (00:15 WAT on Nov 11) -> Today in Lagos -> Upcoming
    const nov11EarlyWat = makeEvent({
      id: "nov-11-wat",
      date: "2026-11-10T23:15:00Z",
    });

    const { upcoming, past } = partitionEvents(
      [nov10Evening, nov11EarlyWat],
      nowUtc
    );

    expect(upcoming.map((e) => e.event.id)).toEqual(["nov-11-wat"]);
    expect(past.map((e) => e.event.id)).toEqual(["nov-10"]);
  });

  it("places archived events into past even if their date is in the future", () => {
    const now = "2026-11-10T10:00:00Z";
    const futureArchived = makeEvent({
      id: "archived-future",
      date: "2026-12-25T14:00:00Z",
      status: "archived",
    });
    const futureActive = makeEvent({
      id: "active-future",
      date: "2026-12-25T14:00:00Z",
      status: "active",
    });

    const { upcoming, past } = partitionEvents(
      [futureArchived, futureActive],
      now
    );

    expect(upcoming.map((e) => e.event.id)).toEqual(["active-future"]);
    expect(past.map((e) => e.event.id)).toEqual(["archived-future"]);
  });

  it("keeps undated non-archived events in upcoming and sorts them last", () => {
    const undated = makeEvent({ id: "undated", date: "" });
    const later = makeEvent({ id: "later", date: "2026-12-20T12:00:00Z" });
    const sooner = makeEvent({ id: "sooner", date: "2026-11-20T12:00:00Z" });

    const sorted = sortUpcoming([undated, later, sooner]);
    expect(sorted.map((e) => e.event.id)).toEqual([
      "sooner",
      "later",
      "undated",
    ]);
  });

  it("picks the soonest dated upcoming event as hero and breaks ties by created_at", () => {
    const now = "2026-11-01T09:00:00Z";
    const tieLaterCreated = makeEvent({
      id: "tie-b",
      date: "2026-11-15T14:00:00Z",
      created_at: "2026-02-01T00:00:00Z",
    });
    const tieEarlierCreated = makeEvent({
      id: "tie-a",
      date: "2026-11-15T18:00:00Z",
      created_at: "2026-01-10T00:00:00Z",
    });
    const undated = makeEvent({
      id: "undated",
      date: "",
      created_at: "2026-01-01T00:00:00Z",
    });

    const hero = pickHeroEvent(
      [undated, tieLaterCreated, tieEarlierCreated],
      now
    );
    expect(hero?.event.id).toBe("tie-a");
  });

  it("falls back to first undated event when no dated upcoming events exist, and null when empty", () => {
    const now = "2026-11-01T09:00:00Z";
    const undatedB = makeEvent({
      id: "u-b",
      date: "",
      created_at: "2026-03-01T00:00:00Z",
    });
    const undatedA = makeEvent({
      id: "u-a",
      date: "",
      created_at: "2026-01-01T00:00:00Z",
    });

    expect(pickHeroEvent([undatedB, undatedA], now)?.event.id).toBe("u-a");
    expect(pickHeroEvent([], now)).toBeNull();
  });
});
