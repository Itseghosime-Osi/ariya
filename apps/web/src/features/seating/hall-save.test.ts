import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { revOf, writeHallLayout } from "./hall-save";
import type { HallLayoutInput } from "./schemas";

const EVENT = "22222222-2222-4222-8222-222222222222";
const LAYOUT = {
  version: 2,
  width: 20,
  length: 15,
} as unknown as HallLayoutInput;

/**
 * A pretend `events` row. Reads return it; an update only lands when its filters match the stored
 * revision, the way PostgREST applies `.is()` / `.eq()` on `hall_layout->rev`.
 */
function fakeDb(initial: unknown, opts: { raceTo?: unknown } = {}) {
  let stored: unknown = initial;
  let raced = false;
  const updates: unknown[] = [];
  const from = vi.fn(() => {
    let patch: { hall_layout: unknown } | null = null;
    const filters: { kind: string; col: string; val: unknown }[] = [];
    const q = {
      select: () => q,
      update: (p: { hall_layout: unknown }) => {
        patch = p;
        return q;
      },
      eq: (col: string, val: unknown) => {
        filters.push({ kind: "eq", col, val });
        return q;
      },
      is: (col: string, val: unknown) => {
        filters.push({ kind: "is", col, val });
        return q;
      },
      maybeSingle: async () => ({ data: { hall_layout: stored }, error: null }),
      then: (resolve: (v: unknown) => unknown) => {
        if (!patch)
          return Promise.resolve({ data: [], error: null }).then(resolve);
        if (opts.raceTo !== undefined && !raced) {
          // Someone else saves between our read and our write.
          raced = true;
          stored = opts.raceTo;
        }
        const ok = filters.every((f) => {
          if (f.col === "id") return true;
          if (f.col === "hall_layout") return stored === null;
          if (f.col === "hall_layout->rev")
            return revOf(stored) === 0 && stored !== null;
          if (f.col === "hall_layout->>rev")
            return String(revOf(stored)) === f.val;
          return false;
        });
        if (ok) {
          stored = patch.hall_layout;
          updates.push(stored);
        }
        return Promise.resolve({
          data: ok ? [{ id: EVENT }] : [],
          error: null,
        }).then(resolve);
      },
    };
    return q;
  });
  return {
    client: { from } as never,
    get stored() {
      return stored;
    },
    updates,
  };
}

describe("writeHallLayout", () => {
  it("saves a first hall as revision 1", async () => {
    const db = fakeDb(null);
    const res = await writeHallLayout(db.client, EVENT, LAYOUT, 0);
    expect(res).toEqual({ ok: true, rev: 1 });
    expect(revOf(db.stored)).toBe(1);
  });

  it("moves an old hall with no revision to revision 1", async () => {
    const db = fakeDb({ version: 2, width: 30 });
    const res = await writeHallLayout(db.client, EVENT, LAYOUT, 0);
    expect(res).toEqual({ ok: true, rev: 1 });
  });

  it("saves on top of the revision the studio loaded", async () => {
    const db = fakeDb({ width: 30, rev: 4 });
    const res = await writeHallLayout(db.client, EVENT, LAYOUT, 4);
    expect(res).toEqual({ ok: true, rev: 5 });
  });

  it("refuses to overwrite a newer hall and hands it back", async () => {
    const theirs = { width: 40, rev: 6 };
    const db = fakeDb(theirs);
    const res = await writeHallLayout(db.client, EVENT, LAYOUT, 5);
    expect(res).toMatchObject({
      ok: false,
      conflict: true,
      rev: 6,
      layout: theirs,
    });
    expect(db.updates).toHaveLength(0);
  });

  it("refuses when someone saves between the read and the write", async () => {
    const db = fakeDb({ width: 30, rev: 2 }, { raceTo: { width: 41, rev: 3 } });
    const res = await writeHallLayout(db.client, EVENT, LAYOUT, 2);
    expect(res).toMatchObject({ ok: false, conflict: true, rev: 3 });
  });

  it("lets a reviewed change (no base) win, and still bumps the revision", async () => {
    const db = fakeDb({ width: 30, rev: 9 });
    const res = await writeHallLayout(db.client, EVENT, LAYOUT);
    expect(res).toEqual({ ok: true, rev: 10 });
  });
});

describe("revOf", () => {
  it("reads a sane revision and ignores junk", () => {
    expect(revOf({ rev: 3 })).toBe(3);
    expect(revOf({ rev: -1 })).toBe(0);
    expect(revOf({ rev: "7" })).toBe(0);
    expect(revOf(null)).toBe(0);
  });
});
