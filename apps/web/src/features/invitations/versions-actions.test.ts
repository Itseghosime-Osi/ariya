import { beforeEach, describe, expect, it, vi } from "vitest";
import { designFromEvent } from "./design";

/** A pretend versions table, newest first, so the trimming rule can be checked without a database. */
const table = vi.hoisted(() => ({
  rows: [] as { id: string; name: string; created_at: string }[],
  deleted: [] as string[],
  next: 0,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => {
      const state: { op?: string; id?: string; row?: { name: string } } = {};
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "order", "limit"]) chain[m] = () => chain;
      chain.insert = (row: { name: string }) => {
        state.op = "insert";
        state.row = row;
        return chain;
      };
      chain.delete = () => {
        state.op = "delete";
        return chain;
      };
      chain.eq = (col: string, value: string) => {
        if (col === "id") state.id = value;
        return chain;
      };
      chain.single = () => {
        const row = {
          id: `new-${table.next++}`,
          name: state.row!.name,
          created_at: "2026-11-15T12:00:00Z",
        };
        table.rows.unshift(row);
        return Promise.resolve({ data: row, error: null });
      };
      chain.range = (from: number, to: number) =>
        Promise.resolve({ data: table.rows.slice(from, to + 1), error: null });
      chain.then = (resolve: (value: unknown) => unknown) => {
        if (state.op === "delete" && state.id) {
          table.deleted.push(state.id);
          table.rows = table.rows.filter((row) => row.id !== state.id);
        }
        return Promise.resolve({ data: null, error: null }).then(resolve);
      };
      return chain;
    },
  }),
}));

import { saveDesignVersionAction } from "./versions-actions";

const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const DESIGN = designFromEvent({ couple: "Ada & Obi", date: "2026-12-12" });

function seed(host: number, ai: number) {
  table.rows = [
    ...Array.from({ length: ai }, (_, i) => ({
      id: `ai-${i}`,
      name: `Before AI: change ${i}`,
      created_at: "2026-11-15T11:00:00Z",
    })),
    ...Array.from({ length: host }, (_, i) => ({
      id: `host-${i}`,
      name: `Host version ${i}`,
      created_at: "2026-11-14T11:00:00Z",
    })),
  ];
}

beforeEach(() => {
  table.rows = [];
  table.deleted = [];
});

describe("saveDesignVersionAction", () => {
  it("never pushes out the host's versions with AI backups", async () => {
    seed(30, 5);
    for (let i = 0; i < 10; i++) {
      await saveDesignVersionAction(EVENT_ID, `Before AI: more ${i}`, DESIGN);
    }
    const names = table.rows.map((row) => row.name);
    expect(names.filter((name) => name.startsWith("Host"))).toHaveLength(30);
    expect(names.filter((name) => name.startsWith("Before AI:"))).toHaveLength(
      5
    );
    expect(table.deleted.every((id) => !id.startsWith("host-"))).toBe(true);
  });

  it("still keeps only the host's newest 30", async () => {
    seed(30, 2);
    await saveDesignVersionAction(EVENT_ID, "Host version new", DESIGN);
    expect(table.deleted).toEqual(["host-29"]);
    expect(
      table.rows.filter((row) => row.name.startsWith("Before AI:"))
    ).toHaveLength(2);
  });
});
