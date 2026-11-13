import { describe, expect, it } from "vitest";
import { summarizeStudioMetrics } from "./studio-metrics";

describe("summarizeStudioMetrics", () => {
  it("counts exports, the success rate, errors and the fastest first export", () => {
    const s = summarizeStudioMetrics([
      { kind: "opened" },
      { kind: "export_ok", format: "png", ms: 90000 },
      { kind: "export_ok", format: "pdf", ms: 45000 },
      { kind: "export_failed", format: "pdf", ms: 60000 },
      { kind: "error" },
    ]);
    expect(s).toEqual({
      exportsOk: 2,
      exportsFailed: 1,
      successRate: 2 / 3,
      errors: 1,
      msToFirstExport: 45000,
    });
  });

  it("has no rate or time when nothing was exported", () => {
    const s = summarizeStudioMetrics([{ kind: "opened" }]);
    expect(s.successRate).toBeNull();
    expect(s.msToFirstExport).toBeNull();
  });
});
