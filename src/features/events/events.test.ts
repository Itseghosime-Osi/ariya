import { describe, expect, it } from "vitest";
import { createEventSchema, updateEventSchema } from "./schemas";
import { daysUntil } from "@/lib/format";

describe("Events Domain", () => {
  describe("createEventSchema", () => {
    it("accepts valid celebration payload", () => {
      const valid = createEventSchema.safeParse({
        title: "Chidinma & Tunde's Nuptials",
        couple: "Chidinma & Tunde",
        date: "2026-12-12T14:00",
        venue: "The Grand Pavilion",
        area: "Victoria Island, Lagos",
        dressCode: "Aṣọ-Ẹbí: Burgundy velvet",
        targetParties: 200,
        intakeMethod: "csv",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects celebration with short couple names", () => {
      const invalid = createEventSchema.safeParse({
        title: "Celebration",
        couple: "A",
        date: "2026-12-12T14:00",
        venue: "The Grand Pavilion",
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects celebration with missing venue", () => {
      const invalid = createEventSchema.safeParse({
        title: "Celebration",
        couple: "Chidinma & Tunde",
        date: "2026-12-12T14:00",
        venue: "",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("updateEventSchema", () => {
    it("accepts partial updates", () => {
      const valid = updateEventSchema.safeParse({
        status: "archived",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("daysUntil calculation", () => {
    it("calculates positive days for future date", () => {
      const future = new Date(
        Date.now() + 10 * 24 * 60 * 60 * 1000
      ).toISOString();
      const days = daysUntil(future);
      expect(days).toBeGreaterThanOrEqual(9);
      expect(days).toBeLessThanOrEqual(11);
    });

    it("returns 0 for past date", () => {
      const past = "2020-01-01T00:00:00Z";
      expect(daysUntil(past)).toBe(0);
    });
  });
});
