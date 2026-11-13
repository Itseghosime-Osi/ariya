import { describe, expect, it } from "vitest";
import { PAGE_TIPS, isOverviewPath, tipsForPath } from "./page-help";

describe("page help", () => {
  it("finds a celebration page's tips by its last segment", () => {
    expect(tipsForPath("/events/abc/guests")?.key).toBe("guests");
    expect(tipsForPath("/events/abc/day-of/")?.key).toBe("day-of");
    expect(tipsForPath("/events/abc/check-in")?.items).toHaveLength(3);
  });

  it("has nothing for pages with their own guide, sub-pages or the overview", () => {
    expect(tipsForPath("/events/abc/seating")).toBeNull();
    expect(tipsForPath("/events/abc/invitations")).toBeNull();
    expect(tipsForPath("/events/abc/guests/import")).toBeNull();
    expect(tipsForPath("/events/abc")).toBeNull();
    expect(tipsForPath("/settings")).toBeNull();
  });

  it("knows a celebration overview, but not the new-celebration page", () => {
    expect(isOverviewPath("/events/abc")).toBe(true);
    expect(isOverviewPath("/events/new")).toBe(false);
    expect(isOverviewPath("/events")).toBe(false);
    expect(isOverviewPath("/events/abc/guests")).toBe(false);
  });

  it("keeps every card to three short tips", () => {
    for (const [key, items] of Object.entries(PAGE_TIPS)) {
      expect(items, key).toHaveLength(3);
      for (const t of items) expect(t.length, `${key}: ${t}`).toBeLessThan(110);
    }
  });
});
