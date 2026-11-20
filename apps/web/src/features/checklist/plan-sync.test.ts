import { describe, expect, it } from "vitest";
import { missingPlanTasks, type PlanTask } from "./plan-sync";

const row = (sourceKey: string): PlanTask =>
  ({
    sourceKey,
    phase: "build",
    title: sourceKey,
    detail: null,
    derivation: "",
    daysBefore: null,
    riskId: null,
    mitigation: null,
    adviceSource: null,
    dueDate: null,
    when: null,
    sort: 0,
  }) as PlanTask;

describe("missingPlanTasks", () => {
  it("adds the venue rows a checklist built before the hall was drawn lacks", () => {
    const plan = [row("book.venue"), row("build.power"), row("build.tent")];
    const missing = missingPlanTasks(plan, ["book.venue"]);
    expect(missing.map((t) => t.sourceKey)).toEqual([
      "build.power",
      "build.tent",
    ]);
  });

  it("never brings back a row the host deleted, or doubles one they have", () => {
    const plan = [row("book.venue"), row("build.power")];
    // Known keys include deleted rows' keys, so a deletion survives the sync.
    expect(missingPlanTasks(plan, ["book.venue", "build.power"])).toEqual([]);
  });
});
