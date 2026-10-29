import { describe, expect, it } from "vitest";
import type { EventWithMetrics } from "../types";
import { buildComingUp, groupByLagosDay, relativeDayLabel } from "./coming-up";

function makeUpcomingEvent(
  id: string,
  title: string,
  date: string,
  rsvp_by: string | null = null
): EventWithMetrics {
  return {
    event: {
      id,
      slug: id,
      title,
      couple: "Couple",
      date,
      rsvp_by,
      venue: "Eko Hotel",
      area: "VI",
      dress_code: null,
      hall_layout: null,
      description: null,
      cover_image_url: null,
      is_public: false,
      paid_at: null,
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
      totalParties: 0,
      totalAttendees: 0,
      acceptedParties: 0,
      acceptedGuests: 0,
      awaitingParties: 0,
      awaitingGuests: 0,
      declinedParties: 0,
      declinedGuests: 0,
      seatedGuests: 0,
      unassignedGuests: 0,
      readinessPercentage: 0,
      daysAway: 5,
      acceptedPartiesPct: 0,
      declinedPartiesPct: 0,
      awaitingPartiesPct: 0,
      rsvpRate: 0,
    },
  };
}

describe("coming-up", () => {
  const now = "2026-11-10T10:00:00Z";

  it("computes relativeDayLabel in Africa/Lagos", () => {
    expect(relativeDayLabel("2026-11-10T15:00:00Z", now)).toBe("Today");
    expect(relativeDayLabel("2026-11-11T15:00:00Z", now)).toBe("Tomorrow");
    expect(relativeDayLabel("2026-11-15T15:00:00Z", now)).toBe("In 5 days");
    expect(relativeDayLabel("2026-11-07T15:00:00Z", now)).toBe("3 days ago");
  });

  it("includes items in [today, today+14 days), sorted & grouped by Lagos day and labelled by event", () => {
    const e1 = makeUpcomingEvent(
      "e1",
      "Ọlá & Adéṣọlá",
      "2026-11-20T14:00:00Z", // +10 days -> in window
      "2026-11-11T14:00:00Z" // +1 day -> in window
    );
    const e2 = makeUpcomingEvent(
      "e2",
      "Tolu & Femi",
      "2026-11-24T14:00:00Z", // +14 days -> outside [today, today+14)
      null
    );

    const items = buildComingUp({
      upcomingEvents: [e1, e2],
      vendorTasks: [
        {
          id: "t1",
          eventId: "e1",
          task: "Final cake tasting",
          dueDate: "2026-11-11T09:00:00Z",
          isDone: false,
          vendorName: "Bakers of Lagos",
        },
        {
          id: "t2",
          eventId: "e2",
          task: "Aso-ebi dispatch",
          dueDate: "2026-11-10T16:00:00Z",
          isDone: false,
        },
        {
          id: "t3-done",
          eventId: "e1",
          task: "Completed deposit",
          dueDate: "2026-11-12T10:00:00Z",
          isDone: true,
        },
      ],
      now,
    });

    expect(items.map((i) => i.id)).toEqual([
      "task-t2",
      "rsvp-e1",
      "task-t1",
      "event-e1",
    ]);
    expect(items[0].eventTitle).toBe("Tolu & Femi");
    expect(items[1].eventTitle).toBe("Ọlá & Adéṣọlá");

    const groups = groupByLagosDay(items);
    expect(groups).toHaveLength(3);
    expect(groups[0].relativeLabel).toBe("Today");
    expect(groups[1].relativeLabel).toBe("Tomorrow");
    expect(groups[1].items).toHaveLength(2);
    expect(groups[2].relativeLabel).toBe("In 10 days");
  });

  it("returns empty array when nothing falls in the 14-day window", () => {
    const farEvent = makeUpcomingEvent(
      "far",
      "Far Future Wedding",
      "2026-12-30T14:00:00Z"
    );
    expect(buildComingUp({ upcomingEvents: [farEvent], now })).toEqual([]);
  });
});
