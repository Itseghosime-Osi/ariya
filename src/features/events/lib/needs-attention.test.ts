import { describe, expect, it } from "vitest";
import type { EventWithMetrics } from "../types";
import {
  buildNeedsAttention,
  FREE_PLAN_LIMIT,
  FREE_PLAN_WARN_THRESHOLD,
} from "./needs-attention";

function makeEventItem(overrides: {
  id: string;
  title?: string;
  date?: string;
  rsvp_by?: string | null;
  paid_at?: string | null;
  awaitingParties?: number;
  acceptedGuests?: number;
  seatedGuests?: number;
}): EventWithMetrics {
  return {
    event: {
      id: overrides.id,
      slug: overrides.id,
      title: overrides.title ?? `Celebration ${overrides.id}`,
      couple: "Kemi & Tunde",
      date: overrides.date ?? "2026-12-25T14:00:00Z",
      rsvp_by: overrides.rsvp_by ?? null,
      venue: "Civic Centre",
      area: "Victoria Island",
      dress_code: null,
      description: null,
      cover_image_url: null,
      is_public: false,
      paid_at: overrides.paid_at ?? null,
      registry_code: null,
      schedule: null,
      invitation_headline: null,
      invitation_message: null,
      invitation_subheadline: null,
      invitation_theme: null,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    role: "owner",
    metrics: {
      totalParties: 20,
      totalAttendees: 40,
      acceptedParties: 10,
      acceptedGuests: overrides.acceptedGuests ?? 10,
      awaitingParties: overrides.awaitingParties ?? 0,
      awaitingGuests: (overrides.awaitingParties ?? 0) * 2,
      declinedParties: 0,
      declinedGuests: 0,
      seatedGuests: overrides.seatedGuests ?? 10,
      unassignedGuests: Math.max(
        0,
        (overrides.acceptedGuests ?? 10) - (overrides.seatedGuests ?? 10)
      ),
      readinessPercentage: 50,
      daysAway: 30,
      acceptedPartiesPct: 50,
      declinedPartiesPct: 0,
      awaitingPartiesPct: 50,
      rsvpRate: 50,
    },
  };
}

describe("needs-attention", () => {
  const now = "2026-11-10T10:00:00Z";

  it("exports FREE_PLAN_WARN_THRESHOLD = 16 and FREE_PLAN_LIMIT = 20", () => {
    expect(FREE_PLAN_WARN_THRESHOLD).toBe(16);
    expect(FREE_PLAN_LIMIT).toBe(20);
  });

  it("evaluates each rule in isolation and pluralises 1 vs n", () => {
    // Rule (a): RSVP deadline within 7 days & awaitingParties > 0
    const rsvp1 = buildNeedsAttention(
      [
        makeEventItem({
          id: "e1",
          rsvp_by: "2026-11-11T12:00:00Z",
          awaitingParties: 1,
        }),
      ],
      { now }
    );
    expect(rsvp1).toHaveLength(1);
    expect(rsvp1[0].message).toBe(
      "1 party hasn't replied · RSVP closes tomorrow"
    );
    expect(rsvp1[0].href).toBe("/events/e1/guests?rsvpStatus=pending");

    // Rule (b): Unseated accepted guests
    const unseated = buildNeedsAttention(
      [
        makeEventItem({
          id: "e2",
          acceptedGuests: 12,
          seatedGuests: 9,
        }),
      ],
      { now }
    );
    expect(unseated).toHaveLength(1);
    expect(unseated[0].message).toBe("3 attending guests aren't seated yet");
    expect(unseated[0].href).toBe("/events/e2/seating");

    // Rule (c): Free plan near 20-invite limit (>= 16)
    const freeNear = buildNeedsAttention([makeEventItem({ id: "e3" })], {
      now,
      invitedCountByEventId: { e3: 16 },
    });
    expect(freeNear).toHaveLength(1);
    expect(freeNear[0].message).toBe("16 of 20 free invites used");
    expect(freeNear[0].href).toBe("/events/e3/billing");

    // Rule (d): Event within 14 days
    const soon = buildNeedsAttention(
      [
        makeEventItem({
          id: "e4",
          title: "Ọlá & Adéṣọlá",
          date: "2026-11-15T14:00:00Z",
        }),
      ],
      { now }
    );
    expect(soon).toHaveLength(1);
    expect(soon[0].message).toBe("Ọlá & Adéṣọlá is in 5 days");
    expect(soon[0].href).toBe("/events/e4");
  });

  it("orders strictly by urgency and caps at 3 items", () => {
    const busyEvent = makeEventItem({
      id: "all-four",
      title: "Grand Owambe",
      date: "2026-11-18T14:00:00Z",
      rsvp_by: "2026-11-13T14:00:00Z",
      awaitingParties: 8,
      acceptedGuests: 20,
      seatedGuests: 15,
      paid_at: null,
    });

    const items = buildNeedsAttention([busyEvent], {
      now,
      invitedCountByEventId: { "all-four": 18 },
    });

    expect(items).toHaveLength(3);
    expect(items.map((i) => i.kind)).toEqual([
      "rsvp_deadline",
      "unseated_guests",
      "free_plan_limit",
    ]);
  });

  it("returns empty array when no conditions apply", () => {
    const calmEvent = makeEventItem({
      id: "calm",
      date: "2026-12-28T14:00:00Z",
      rsvp_by: "2026-12-10T14:00:00Z",
      awaitingParties: 0,
      acceptedGuests: 10,
      seatedGuests: 10,
      paid_at: null,
    });

    expect(
      buildNeedsAttention([calmEvent], {
        now,
        invitedCountByEventId: { calm: 5 },
      })
    ).toEqual([]);
  });
});
