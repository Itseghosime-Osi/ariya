import { describe, expect, it } from "vitest";
import { isEventExpired } from "./event-expiry";

// 2027-01-16 14:00 WAT
const EVENT = "2027-01-16T13:00:00Z";

describe("isEventExpired", () => {
  it("is not expired before the day", () => {
    expect(isEventExpired(EVENT, Date.parse("2027-01-10T09:00:00Z"))).toBe(
      false
    );
  });

  it("is not expired on the day itself, even late at night in Lagos", () => {
    // 23:30 WAT on the 16th is 22:30Z.
    expect(isEventExpired(EVENT, Date.parse("2027-01-16T22:30:00Z"))).toBe(
      false
    );
  });

  it("expires at midnight Lagos time, the next day", () => {
    // 00:30 WAT on the 17th is 23:30Z on the 16th.
    expect(isEventExpired(EVENT, Date.parse("2027-01-16T23:30:00Z"))).toBe(
      true
    );
    expect(isEventExpired(EVENT, Date.parse("2027-02-01T12:00:00Z"))).toBe(
      true
    );
  });

  it("is never expired without a usable date", () => {
    expect(isEventExpired(null)).toBe(false);
    expect(isEventExpired("not a date")).toBe(false);
  });
});
