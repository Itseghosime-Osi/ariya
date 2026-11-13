import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CHECKLIST,
  loadChecklist,
  missingFiles,
  summaryCounts,
} from "./designer-checklist-parse";

/**
 * Checklist J3: the studio checklist is re-checked every release. This keeps it honest between
 * re-checks: the counts add up, every closed item says what proves it, every open item says why,
 * and every evidence file an item points at still exists.
 */
describe("designer redesign checklist", () => {
  const items = loadChecklist();

  it("lists each item once", () => {
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(items.length).toBeGreaterThan(70);
  });

  it("has a close-out summary that matches the items", () => {
    const summary = summaryCounts(readFileSync(CHECKLIST, "utf8"));
    expect(summary).not.toBeNull();
    const closed = items.filter((i) => i.closed).length;
    expect(summary).toEqual({
      closed,
      total: items.length,
      open: items.length - closed,
    });
  });

  it("gives every closed item a line saying what proves it", () => {
    const bare = items.filter((i) => i.closed && !i.note).map((i) => i.id);
    expect(bare).toEqual([]);
  });

  it("gives every open item a line saying why it is open", () => {
    const bare = items.filter((i) => !i.closed && !i.note).map((i) => i.id);
    expect(bare).toEqual([]);
  });

  it("points only at evidence files that exist", () => {
    const broken = items
      .map((i) => ({ id: i.id, missing: missingFiles(i) }))
      .filter((r) => r.missing.length > 0);
    expect(broken).toEqual([]);
  });
});
