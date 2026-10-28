import { describe, it, expect } from "vitest";
import {
  formatKobo,
  normalizePhone,
  formatPhone,
  formatLagosDate,
  formatEventDate,
  formatWatDatetimeLocal,
  parseWatDateToUtc,
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

  it("formats user-facing event date as '12 Dec 2026, 2:00 PM WAT' in Africa/Lagos timezone", () => {
    expect(formatEventDate("2026-12-12T13:00:00Z")).toBe(
      "12 Dec 2026, 2:00 PM WAT"
    );
  });

  it("converts WAT wizard input to UTC correctly (14:00 WAT -> 13:00 UTC)", () => {
    expect(parseWatDateToUtc("2026-12-12T14:00")).toBe(
      "2026-12-12T13:00:00.000Z"
    );
    expect(parseWatDateToUtc("2026-12-12T14:00:00")).toBe(
      "2026-12-12T13:00:00.000Z"
    );
    expect(parseWatDateToUtc("2026-12-12 14:00")).toBe(
      "2026-12-12T13:00:00.000Z"
    );
    expect(parseWatDateToUtc("2026-12-12T13:00:00Z")).toBe(
      "2026-12-12T13:00:00.000Z"
    );
    expect(parseWatDateToUtc("2026-12-01")).toBe("2026-11-30T23:00:00.000Z");
  });

  it("formats UTC date into WAT datetime-local string (13:00 UTC -> 14:00 WAT)", () => {
    expect(formatWatDatetimeLocal("2026-12-12T13:00:00.000Z")).toBe(
      "2026-12-12T14:00"
    );
    expect(formatWatDatetimeLocal("")).toBe("");
  });
});
