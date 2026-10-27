import { describe, it, expect } from "vitest";
import { normalizePhoneNumber, formatPhoneDisplay } from "./phone";

describe("normalizePhoneNumber", () => {
  it("normalizes standard Nigerian 11-digit numbers with leading 0", () => {
    expect(normalizePhoneNumber("08031234567")).toBe("+2348031234567");
    expect(normalizePhoneNumber("0701 234 5678")).toBe("+2347012345678");
    expect(normalizePhoneNumber("090-9876-5432")).toBe("+2349098765432");
    expect(normalizePhoneNumber("(0812) 345 6789")).toBe("+2348123456789");
  });

  it("normalizes Nigerian 10-digit numbers without leading 0", () => {
    expect(normalizePhoneNumber("8031234567")).toBe("+2348031234567");
  });

  it("normalizes Nigerian numbers starting with 234 without plus", () => {
    expect(normalizePhoneNumber("2348031234567")).toBe("+2348031234567");
    expect(normalizePhoneNumber("234 803 123 4567")).toBe("+2348031234567");
  });

  it("preserves already formatted E.164 Nigerian numbers", () => {
    expect(normalizePhoneNumber("+2348031234567")).toBe("+2348031234567");
    expect(normalizePhoneNumber("+234 803 123 4567")).toBe("+2348031234567");
  });

  it("preserves international numbers with country codes", () => {
    expect(normalizePhoneNumber("+1 555 123 4567")).toBe("+15551234567");
    expect(normalizePhoneNumber("+44 20 7946 0958")).toBe("+442079460958");
    expect(normalizePhoneNumber("+233 24 123 4567")).toBe("+233241234567");
  });

  it("handles null, undefined, empty and invalid numbers gracefully", () => {
    expect(normalizePhoneNumber(null)).toBeNull();
    expect(normalizePhoneNumber(undefined)).toBeNull();
    expect(normalizePhoneNumber("")).toBeNull();
    expect(normalizePhoneNumber("   ")).toBeNull();
    expect(normalizePhoneNumber("invalid")).toBeNull();
    expect(normalizePhoneNumber("123")).toBeNull();
  });
});

describe("formatPhoneDisplay", () => {
  it("formats Nigerian E.164 numbers nicely", () => {
    expect(formatPhoneDisplay("+2348031234567")).toBe("+234 803 123 4567");
    expect(formatPhoneDisplay("08031234567")).toBe("+234 803 123 4567");
  });

  it("falls back gracefully for null or empty", () => {
    expect(formatPhoneDisplay(null)).toBe("—");
    expect(formatPhoneDisplay(undefined)).toBe("—");
  });
});
