import { describe, it, expect } from "vitest";
import {
  calculateCelebrationMetrics,
  getPartyDisplaySeats,
  formatEventCardMetrics,
  type GuestMetricItem,
} from "./metrics";

describe("metrics", () => {
  describe("getPartyDisplaySeats", () => {
    it("returns invited party_size when guest has not responded", () => {
      const guest: GuestMetricItem = {
        party_size: 3,
        rsvp: null,
      };
      expect(getPartyDisplaySeats(guest)).toBe(3);
    });

    it("returns accepted attending_count for Amina accepted for 2 with party_size 1", () => {
      const amina: GuestMetricItem = {
        party_size: 1,
        rsvp: {
          status: "accepted",
          attending_count: 2,
        },
      };
      expect(getPartyDisplaySeats(amina)).toBe(2);
    });

    it("falls back to 1 if party_size is 0 or negative", () => {
      const guest: GuestMetricItem = {
        party_size: 0,
        rsvp: null,
      };
      expect(getPartyDisplaySeats(guest)).toBe(1);
    });
  });

  describe("calculateCelebrationMetrics", () => {
    it("handles zero guests correctly without divide-by-zero errors", () => {
      const metrics = calculateCelebrationMetrics([]);
      expect(metrics.invitedParties).toBe(0);
      expect(metrics.expectedPeople).toBe(0);
      expect(metrics.seatedPeople).toBe(0);
      expect(metrics.unassignedPeople).toBe(0);
      expect(metrics.rsvpRate).toBe(0);
    });

    it("accurately computes invited parties, expected people, seated people, and RSVP rate", () => {
      const guests: GuestMetricItem[] = [
        // Amina: party_size 1, accepted for 2, seated at Table 1
        {
          id: "g1",
          party_size: 1,
          rsvp: { status: "accepted", attending_count: 2 },
          seat: { table_id: "t1", table_name: "Table 1" },
        },
        // Babatunde: party_size 3, accepted for 3, not seated
        {
          id: "g2",
          party_size: 3,
          rsvp: { status: "accepted", attending_count: 3 },
          seat: null,
        },
        // Chidinma: party_size 2, declined
        {
          id: "g3",
          party_size: 2,
          rsvp: { status: "declined", attending_count: 0 },
        },
        // Dayo: party_size 4, pending
        {
          id: "g4",
          party_size: 4,
          rsvp: { status: "pending" },
        },
      ];

      const metrics = calculateCelebrationMetrics(guests);

      // 4 guest rows = 4 invited parties
      expect(metrics.invitedParties).toBe(4);
      expect(metrics.totalParties).toBe(4);

      // Expected people = Amina (2) + Babatunde (3) = 5 people
      expect(metrics.expectedPeople).toBe(5);
      expect(metrics.acceptedGuests).toBe(5);
      expect(metrics.acceptedParties).toBe(2);

      // Seated people = Amina seated for 2 = 2 people
      expect(metrics.seatedPeople).toBe(2);
      expect(metrics.seatedGuests).toBe(2);

      // Unassigned people = 5 - 2 = 3 people (Babatunde's party)
      expect(metrics.unassignedPeople).toBe(3);

      // Responded parties = Amina (accepted) + Babatunde (accepted) + Chidinma (declined) = 3 parties
      expect(metrics.respondedParties).toBe(3);

      // RSVP rate = 3 responded / 4 invited = 75%
      expect(metrics.rsvpRate).toBe(75);

      // Declined parties = 1 party, 2 guests
      expect(metrics.declinedParties).toBe(1);
      expect(metrics.declinedGuests).toBe(2);

      // Awaiting parties = 1 party, 4 guests
      expect(metrics.awaitingParties).toBe(1);
      expect(metrics.awaitingGuests).toBe(4);
    });

    it("correctly computes units and party-based percentages for Amina (accepted 2), Tola (accepted 1), and Chidi (declined)", () => {
      const guests: GuestMetricItem[] = [
        {
          id: "amina",
          party_size: 1,
          rsvp: { status: "accepted", attending_count: 2 },
        },
        {
          id: "tola",
          party_size: 1,
          rsvp: { status: "accepted", attending_count: 1 },
        },
        {
          id: "chidi",
          party_size: 1,
          rsvp: { status: "declined", attending_count: 0 },
        },
      ];

      const metrics = calculateCelebrationMetrics(guests);

      // Explicit party & people metrics
      expect(metrics.invitedParties).toBe(3);
      expect(metrics.totalParties).toBe(3);
      expect(metrics.acceptedParties).toBe(2);
      expect(metrics.declinedParties).toBe(1);
      expect(metrics.awaitingParties).toBe(0);
      expect(metrics.respondedParties).toBe(3);

      // People attending = Amina (2) + Tola (1) = 3 people
      expect(metrics.expectedPeople).toBe(3);
      expect(metrics.acceptedGuests).toBe(3);

      // Percentages computed over parties
      expect(metrics.acceptedPartiesPct).toBe(67); // 2 of 3 parties = 67%
      expect(metrics.declinedPartiesPct).toBe(33); // 1 of 3 parties = 33%
      expect(metrics.awaitingPartiesPct).toBe(0);

      // Must never report 100% confirmed alongside 33% declined
      expect(metrics.acceptedPartiesPct + metrics.declinedPartiesPct).toBe(100);
      expect(metrics.acceptedPartiesPct).not.toBe(100);

      // Event card formatting helper
      const cardSummary = formatEventCardMetrics({
        totalParties: metrics.totalParties,
        acceptedGuests: metrics.expectedPeople,
        rsvpRate: 67, // e.g. 67% responded
      });
      expect(cardSummary).toBe(
        "3 parties invited · 3 people attending · 67% responded"
      );
    });
  });
});
