import { describe, expect, it } from "vitest";
import { planSeating, type SeatTable, type SeatUnit } from "./autoseat";
import { normaliseRules, pruneRules, ruleBreaks, type SeatRule } from "./rules";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const unit = (n: number, group = "Guests", seats = 1): SeatUnit => ({
  id: id(n),
  name: `G${n}`,
  seats,
  group,
  vip: false,
});
const table = (tid: string, capacity: number, x = 0): SeatTable => ({
  id: tid,
  name: tid,
  capacity,
  occupied: 0,
  shape: "round",
  x,
  y: 5,
});
const front = { x: 0, y: 0 };
const tableOf = (plan: ReturnType<typeof planSeating>) =>
  new Map(plan.assignments.map((a) => [a.guestId, a.tableId]));

describe("normaliseRules", () => {
  it("keeps well-formed rules and drops the rest", () => {
    const rules = normaliseRules([
      { id: "a", kind: "together", guestIds: [id(1), id(2), id(2)] },
      { id: "b", kind: "apart", guestIds: [id(1)] },
      { id: "c", kind: "maybe", guestIds: [id(1), id(2)] },
      { id: "d", kind: "apart", guestIds: ["not-a-guid", id(3)] },
      null,
    ]);
    expect(rules).toEqual([
      { id: "a", kind: "together", guestIds: [id(1), id(2)] },
    ]);
  });

  it("forgets guests who left the list", () => {
    const rules: SeatRule[] = [
      { id: "a", kind: "together", guestIds: [id(1), id(2), id(3)] },
      { id: "b", kind: "apart", guestIds: [id(1), id(4)] },
    ];
    expect(pruneRules(rules, new Set([id(1), id(2)]))).toEqual([
      { id: "a", kind: "together", guestIds: [id(1), id(2)] },
    ]);
  });
});

describe("planSeating with rules", () => {
  it("seats a keep-together rule at one table even across groups", () => {
    const plan = planSeating(
      [unit(1, "Church"), unit(2, "Work"), unit(3, "Work")],
      [table("t1", 2, 1), table("t2", 4, 2)],
      front,
      { rules: [{ id: "r", kind: "together", guestIds: [id(1), id(2)] }] }
    );
    const at = tableOf(plan);
    expect(at.get(id(1))).toBe(at.get(id(2)));
  });

  it("never seats a keep-apart pair at the same table", () => {
    const plan = planSeating(
      [unit(1, "Family"), unit(2, "Family")],
      [table("t1", 10, 1), table("t2", 10, 2)],
      front,
      { rules: [{ id: "r", kind: "apart", guestIds: [id(1), id(2)] }] }
    );
    const at = tableOf(plan);
    expect(at.get(id(1))).toBeDefined();
    expect(at.get(id(2))).toBeDefined();
    expect(at.get(id(1))).not.toBe(at.get(id(2)));
  });

  it("keeps a guest away from someone already seated", () => {
    const plan = planSeating(
      [unit(2)],
      [table("t1", 10, 1), table("t2", 10, 9)],
      front,
      {
        rules: [{ id: "r", kind: "apart", guestIds: [id(1), id(2)] }],
        occupants: new Map([["t1", [id(1)]]]),
      }
    );
    expect(tableOf(plan).get(id(2))).toBe("t2");
  });

  it("brings a keep-together guest to the table the others already sit at", () => {
    const plan = planSeating(
      [unit(2)],
      [table("t1", 10, 1), table("t2", 10, 9)],
      front,
      {
        rules: [{ id: "r", kind: "together", guestIds: [id(1), id(2)] }],
        occupants: new Map([["t2", [id(1)]]]),
      }
    );
    expect(tableOf(plan).get(id(2))).toBe("t2");
  });

  it("leaves a guest unplaced rather than break a keep-apart rule", () => {
    const plan = planSeating([unit(2)], [table("t1", 10)], front, {
      rules: [{ id: "r", kind: "apart", guestIds: [id(1), id(2)] }],
      occupants: new Map([["t1", [id(1)]]]),
    });
    expect(plan.assignments).toHaveLength(0);
    expect(plan.unplaced.map((u) => u.id)).toEqual([id(2)]);
  });
});

describe("ruleBreaks", () => {
  const names = (g: string) => `Guest ${g.slice(-1)}`;
  const tables = (t: string) => `Table ${t}`;

  it("reports a together rule spread over tables and an apart rule sharing one", () => {
    const at = new Map<string, string | null>([
      [id(1), "1"],
      [id(2), "2"],
      [id(3), "3"],
      [id(4), "3"],
    ]);
    const out = ruleBreaks(
      [
        { id: "t", kind: "together", guestIds: [id(1), id(2)] },
        { id: "a", kind: "apart", guestIds: [id(3), id(4)] },
      ],
      at,
      names,
      tables
    );
    expect(out.map((b) => b.rule.id)).toEqual(["t", "a"]);
    expect(out[0].reason).toContain("Table 1 and Table 2");
    expect(out[1].reason).toContain("share Table 3");
  });

  it("is quiet while guests have no seat yet", () => {
    const out = ruleBreaks(
      [{ id: "t", kind: "together", guestIds: [id(1), id(2)] }],
      new Map([[id(1), "1"]]),
      names,
      tables
    );
    expect(out).toEqual([]);
  });
});
