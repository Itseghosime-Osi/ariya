import { describe, expect, it } from "vitest";
import type { RiskItem } from "@ariya/studio";
import { defaultLayout } from "./model";
import { daysUntil, dueWords, groupRisks, riskRequest } from "./risk";

const item = (over: Partial<RiskItem>): RiskItem => ({
  id: "venue.exits",
  category: "venue",
  title: "A risk",
  likelihood: "medium",
  impact: "high",
  safetyCritical: false,
  mitigation: "Do something with a number in it.",
  source: "Research §D.1–D.2",
  when: "Site visit",
  due: "2026-11-21",
  derivation: "every event",
  ...over,
});

describe("risk request", () => {
  it("takes the month from the event date, not the clock", () => {
    const request = riskRequest(defaultLayout(), 30, 300, "2026-12-12");
    expect(request.month).toBe(12);
    expect(request.eventDate).toBe("2026-12-12");
  });

  it("leaves the month unset when there is no date, rather than guessing", () => {
    expect(riskRequest(defaultLayout(), 30, 300, null).month).toBeNull();
    expect(
      riskRequest(defaultLayout(), 30, 300, "not-a-date").month
    ).toBeNull();
  });

  it("reads an ISO timestamp down to the month", () => {
    const request = riskRequest(
      defaultLayout(),
      30,
      300,
      "2026-03-05T18:30:00.000Z"
    );
    expect(request.month).toBe(3);
  });

  it("carries the venue facts the register reads", () => {
    const layout = defaultLayout();
    layout.venue.capacity = { certified: 250, source: "certificate" };
    layout.venue.services = {
      power: "generator",
      generatorKva: 100,
      water: null,
      toilets: 8,
      parking: null,
    };
    layout.chandeliers = true;

    const request = riskRequest(layout, 30, 300, "2026-12-12");
    expect(request.capacity).toBe(250);
    expect(request.power).toBe("generator");
    expect(request.generatorKva).toBe(100);
    expect(request.toilets).toBe(8);
    expect(request.chandeliers).toBe(true);
    expect(request.tables).toBe(30);
  });
});

describe("grouping", () => {
  it("puts safety-critical rows first inside a group", () => {
    const groups = groupRisks([
      item({ id: "a", safetyCritical: false }),
      item({ id: "b", safetyCritical: true }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("drops a group with nothing in it, and keeps the register's order", () => {
    const groups = groupRisks([
      item({ id: "c", category: "money" }),
      item({ id: "v", category: "venue" }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["venue", "money"]);
  });
});

describe("dates", () => {
  it("writes a due date the way a host reads it", () => {
    expect(dueWords("2026-11-21")).toBe("Sat 21 Nov");
  });

  it("counts the days from today, in whole days", () => {
    const today = new Date(2026, 10, 14, 23, 30);
    expect(daysUntil("2026-11-21", today)).toBe(7);
  });

  it("says nothing rather than a wrong number for an unreadable date", () => {
    expect(daysUntil("nonsense")).toBeNull();
  });
});
