import { describe, expect, it } from "vitest";
import type { EventWithMetrics } from "../types";
import {
  filterEvents,
  normalizeSearchText,
  SEARCH_THRESHOLD,
} from "./filter-events";

function makeItem(
  id: string,
  fields: {
    title: string;
    couple: string;
    venue: string;
    area?: string | null;
  }
): EventWithMetrics {
  return {
    event: {
      id,
      slug: id,
      title: fields.title,
      couple: fields.couple,
      venue: fields.venue,
      area: fields.area ?? null,
      date: "2026-12-12T14:00:00Z",
      rsvp_by: null,
      dress_code: null,
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
      daysAway: 10,
      acceptedPartiesPct: 0,
      declinedPartiesPct: 0,
      awaitingPartiesPct: 0,
      rsvpRate: 0,
    },
  };
}

describe("filter-events", () => {
  const sample = [
    makeItem("1", {
      title: "The Royal Nuptials of Ọlá & Adéṣọlá",
      couple: "Ọlá & Adéṣọlá",
      venue: "Eko Convention Centre",
      area: "Victoria Island, Lagos",
    }),
    makeItem("2", {
      title: "Chidinma & Obinna Traditional Engagement",
      couple: "Chidinma & Obinna",
      venue: "Landmark Event Centre",
      area: "Oniru, Lagos",
    }),
  ];

  it("exposes SEARCH_THRESHOLD = 3", () => {
    expect(SEARCH_THRESHOLD).toBe(3);
  });

  it("matches case-insensitively and diacritic-insensitively ('Adesola' and 'Adéṣọlá' both match 'Adéṣọlá')", () => {
    expect(normalizeSearchText("Adéṣọlá")).toBe("adesola");
    expect(filterEvents(sample, "Adesola").map((e) => e.event.id)).toEqual([
      "1",
    ]);
    expect(filterEvents(sample, "Adéṣọlá").map((e) => e.event.id)).toEqual([
      "1",
    ]);
    expect(filterEvents(sample, "OLA").map((e) => e.event.id)).toEqual(["1"]);
  });

  it("matches across title, couple, venue, and area", () => {
    expect(filterEvents(sample, "landmark").map((e) => e.event.id)).toEqual([
      "2",
    ]);
    expect(
      filterEvents(sample, "victoria island").map((e) => e.event.id)
    ).toEqual(["1"]);
    expect(filterEvents(sample, "nonexistent")).toEqual([]);
  });
});
