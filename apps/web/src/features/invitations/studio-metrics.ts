/**
 * Anonymous studio metrics (checklist J1): what happened, in which format and how long after the
 * studio opened. Nothing about the card, the guests or the person.
 */
export type StudioMetricKind =
  "opened" | "export_ok" | "export_failed" | "error";

export type StudioMetricRow = {
  kind: StudioMetricKind;
  format?: string | null;
  ms?: number | null;
};

export type StudioMetricSummary = {
  exportsOk: number;
  exportsFailed: number;
  /** Share of exports that worked, 0 to 1; null when there were none. */
  successRate: number | null;
  errors: number;
  /** Fastest time from opening the studio to a first finished export, in milliseconds. */
  msToFirstExport: number | null;
};

export function summarizeStudioMetrics(
  rows: StudioMetricRow[]
): StudioMetricSummary {
  const ok = rows.filter((r) => r.kind === "export_ok");
  const failed = rows.filter((r) => r.kind === "export_failed");
  const times = ok
    .map((r) => r.ms)
    .filter((n): n is number => typeof n === "number");
  const total = ok.length + failed.length;
  return {
    exportsOk: ok.length,
    exportsFailed: failed.length,
    successRate: total === 0 ? null : ok.length / total,
    errors: rows.filter((r) => r.kind === "error").length,
    msToFirstExport: times.length ? Math.min(...times) : null,
  };
}
