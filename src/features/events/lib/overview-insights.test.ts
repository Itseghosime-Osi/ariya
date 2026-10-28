import { describe, expect, it } from "vitest";
import type { EventMetrics } from "../types";
import {
  buildPlanningPhases,
  computeReadiness,
  formatNairaCompact,
  layoutConstellation,
  pickNextAction,
  pickNextActions,
  summariseBudget,
  type PlanningTask,
  type PlanningVendor,
} from "./overview-insights";

const metrics = (over: Partial<EventMetrics> = {}): EventMetrics => ({
  totalParties: 20,
  totalAttendees: 40,
  acceptedParties: 12,
  acceptedGuests: 24,
  awaitingParties: 6,
  awaitingGuests: 12,
  declinedParties: 2,
  declinedGuests: 4,
  seatedGuests: 18,
  unassignedGuests: 6,
  readinessPercentage: 70,
  daysAway: 45,
  acceptedPartiesPct: 60,
  declinedPartiesPct: 10,
  awaitingPartiesPct: 30,
  rsvpRate: 70,
  ...over,
});

const vendor = (over: Partial<PlanningVendor> = {}): PlanningVendor => ({
  id: "v1",
  name: "Mama Put Catering",
  category: "Catering",
  costKobo: 100_000_00,
  depositKobo: 40_000_00,
  status: "confirmed",
  ...over,
});

const task = (over: Partial<PlanningTask> = {}): PlanningTask => ({
  id: "t1",
  task: "Tasting",
  dueDate: null,
  isDone: false,
  vendorName: null,
  ...over,
});

describe("computeReadiness", () => {
  it("measures five areas and averages them", () => {
    const r = computeReadiness(
      metrics(),
      [
        vendor(),
        vendor({
          id: "v2",
          status: "draft",
          costKobo: 100_000_00,
          depositKobo: 0,
        }),
      ],
      [task({ isDone: true }), task({ id: "t2" })]
    );
    const byKey = Object.fromEntries(r.segments.map((s) => [s.key, s]));
    expect(byKey.guests.summary).toBe("14/20 replied");
    expect(byKey.guests.ratio).toBeCloseTo(0.7);
    expect(byKey.seating.summary).toBe("18/24 seated");
    expect(byKey.vendors.summary).toBe("1/2 confirmed");
    expect(byKey.budget.summary).toBe("20% paid");
    expect(byKey.tasks.summary).toBe("1/2 done");
    expect(r.overall).toBe(
      Math.round(((0.7 + 0.75 + 0.5 + 0.2 + 0.5) / 5) * 100)
    );
  });

  it("is zero, not NaN, for an empty celebration", () => {
    const r = computeReadiness(
      metrics({
        totalParties: 0,
        acceptedParties: 0,
        declinedParties: 0,
        acceptedGuests: 0,
        seatedGuests: 0,
      }),
      [],
      []
    );
    expect(r.overall).toBe(0);
    expect(r.segments.every((s) => s.ratio === 0)).toBe(true);
    expect(r.segments.find((s) => s.key === "budget")!.summary).toBe(
      "No costs yet"
    );
  });
});

describe("buildPlanningPhases", () => {
  it("marks the phase holding today as current and files tasks by due date", () => {
    const phases = buildPlanningPhases(
      "2026-12-12",
      [
        task({ dueDate: "2026-05-01", isDone: true }),
        task({ id: "t2", dueDate: "2026-11-20" }),
        task({ id: "t3", dueDate: null }),
      ],
      "2026-11-01"
    );
    expect(phases.map((p) => p.state)).toEqual([
      "done",
      "done",
      "done",
      "current",
      "upcoming",
    ]);
    const final = phases.find((p) => p.key === "final")!;
    // The dated November task and the undated task both live in the current phase.
    expect(final.tasksTotal).toBe(2);
    // 1 May is 225 days out, so it belongs to Foundations.
    expect(phases.find((p) => p.key === "foundations")!.tasksDone).toBe(1);
  });

  it("makes the first phase current long before the day, and all done after it", () => {
    expect(buildPlanningPhases("2027-12-12", [], "2026-01-01")[0].state).toBe(
      "current"
    );
    expect(
      buildPlanningPhases("2026-01-01", [], "2026-02-01").every(
        (p) => p.state === "done"
      )
    ).toBe(true);
  });

  it("returns nothing without a date", () => {
    expect(buildPlanningPhases(null, [], "2026-01-01")).toEqual([]);
  });
});

describe("summariseBudget", () => {
  it("groups by category, largest first", () => {
    const b = summariseBudget([
      vendor(),
      vendor({
        id: "v2",
        category: "DJ",
        costKobo: 30_000_00,
        depositKobo: 30_000_00,
      }),
      vendor({
        id: "v3",
        category: "Catering",
        costKobo: 50_000_00,
        depositKobo: 0,
      }),
    ]);
    expect(b.categories.map((c) => c.category)).toEqual(["Catering", "DJ"]);
    expect(b.committedKobo).toBe(180_000_00);
    expect(b.paidKobo).toBe(70_000_00);
    expect(b.outstandingKobo).toBe(110_000_00);
  });
});

describe("pickNextAction", () => {
  const base = {
    eventId: "e1",
    vendors: [vendor()],
    tasks: [] as PlanningTask[],
    todayKey: "2026-11-01",
  };

  it("starts with the guest list when there is none", () => {
    expect(
      pickNextAction({ ...base, metrics: metrics({ totalParties: 0 }) }).cta
    ).toBe("Add guests");
  });

  it("puts overdue vendor tasks first", () => {
    const a = pickNextAction({
      ...base,
      metrics: metrics(),
      tasks: [
        task({
          dueDate: "2026-10-01",
          task: "Pay DJ deposit",
          vendorName: "DJ Spinall",
        }),
      ],
    });
    expect(a.tone).toBe("urgent");
    expect(a.title).toBe("Overdue: Pay DJ deposit");
  });

  it("nudges pending replies inside the last month", () => {
    const a = pickNextAction({ ...base, metrics: metrics({ daysAway: 20 }) });
    expect(a.title).toBe("Nudge 6 parties still to reply");
  });

  it("celebrates when everything is done", () => {
    const a = pickNextAction({
      ...base,
      metrics: metrics({ awaitingParties: 0, unassignedGuests: 0 }),
    });
    expect(a.tone).toBe("celebrate");
  });
});

describe("layoutConstellation", () => {
  it("places one dot per party in deterministic blooms by side", () => {
    const guests = [
      {
        id: "a",
        name: "Amina",
        side: "Bride",
        partySize: 2,
        status: "accepted" as const,
      },
      {
        id: "b",
        name: "Bayo",
        side: "Groom",
        partySize: 1,
        status: "pending" as const,
      },
      {
        id: "c",
        name: "Chidi",
        side: "Family",
        partySize: 1,
        status: "declined" as const,
      },
    ];
    const one = layoutConstellation(guests);
    const two = layoutConstellation(guests);
    expect(one.dots).toHaveLength(3);
    expect(one.groups.map((g) => g.label)).toEqual([
      "Bride",
      "Family",
      "Groom",
    ]);
    expect(one).toEqual(two);
    for (const d of one.dots) {
      expect(d.x).toBeGreaterThan(0);
      expect(d.x).toBeLessThan(one.width);
      expect(d.y).toBeGreaterThan(0);
      expect(d.y).toBeLessThan(one.height);
    }
    // A bigger party gets a bigger dot.
    expect(one.dots.find((d) => d.id === "a")!.r).toBeGreaterThan(
      one.dots.find((d) => d.id === "b")!.r
    );
  });

  it("is empty without guests", () => {
    expect(layoutConstellation([]).dots).toEqual([]);
  });
});

describe("formatNairaCompact", () => {
  it("writes short naira the same everywhere", () => {
    expect(formatNairaCompact(4_500_000_00)).toBe("₦4.5M");
    expect(formatNairaCompact(850_000_00)).toBe("₦850K");
    expect(formatNairaCompact(1_000_000_00)).toBe("₦1M");
    expect(formatNairaCompact(45_000)).toBe("₦450");
    expect(formatNairaCompact(250_000_000_000_00)).toBe("₦250B");
  });
});

describe("pickNextActions", () => {
  it("ranks everything worth doing, overdue first", () => {
    const list = pickNextActions({
      eventId: "e1",
      metrics: metrics({ daysAway: 20 }),
      vendors: [vendor(), vendor({ id: "v2", status: "draft" })],
      tasks: [task({ dueDate: "2026-10-01", task: "Pay DJ deposit" })],
      todayKey: "2026-11-01",
    });
    expect(list.map((a) => a.cta)).toEqual([
      "Open vendors",
      "Send reminders",
      "Open seating",
      "Open vendors",
    ]);
    expect(list[3].title).toBe("Confirm 1 vendor");
  });

  it("files each phase's own tasks, earliest first", () => {
    const phases = buildPlanningPhases(
      "2026-12-12",
      [
        task({ id: "b", dueDate: "2026-11-30" }),
        task({ id: "a", dueDate: "2026-11-05" }),
      ],
      "2026-11-01"
    );
    expect(
      phases.find((p) => p.key === "final")!.tasks.map((t) => t.id)
    ).toEqual(["a", "b"]);
  });
});
