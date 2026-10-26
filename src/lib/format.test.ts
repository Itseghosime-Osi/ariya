import { describe, it, expect } from "vitest";
import {
  formatKobo,
  normalizePhone,
  formatPhone,
  formatLagosDate,
} from "./format";

describe("Formatting utilities", () => {
  it("formats integer kobo to NGN currency", () => {
    expect(formatKobo(2500000)).toMatch(/25,000/);
    expect(formatKobo(50000)).toMatch(/500/);
    expect(formatKobo(0)).toMatch(/0/);
  });

  it("normalizes Nigerian phone numbers", () => {
    expect(normalizePhone("08031234501")).toBe("+2348031234501");
    expect(normalizePhone("+2348031234501")).toBe("+2348031234501");
    expect(normalizePhone("2348031234501")).toBe("+2348031234501");
    expect(normalizePhone("0803 123 4501")).toBe("+2348031234501");
    expect(normalizePhone("invalid-phone")).toBeNull();
  });

  it("formats Nigerian phone numbers for human display", () => {
    expect(formatPhone("+2348031234501")).toBe("0803 123 4501");
    expect(formatPhone(null)).toBe("");
  });

  it("formats dates in Lagos timezone", () => {
    const formatted = formatLagosDate("2026-12-12T14:00:00Z");
    expect(formatted).toContain("December 2026");
  });
});
