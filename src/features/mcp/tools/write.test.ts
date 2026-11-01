import { describe, it, expect, vi, afterEach } from "vitest";
import type { ToolContext } from "../guard";
import { ToolError } from "../result";
import {
  checkEventCreationBudget,
  EVENT_CREATION_WINDOW_MS,
  MAX_EVENTS_PER_DAY,
} from "./write";

const NOW = new Date("2026-11-01T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

/**
 * The real chains are `from(...).select(...).eq(...)` and `.select(...).in(...).gte(...).order(...)`,
 * awaited at the end. A thenable covers both shapes.
 */
function chain(result: { data: unknown; error: unknown }) {
  const query = {
    select: () => query,
    eq: () => query,
    in: () => query,
    gte: () => query,
    order: () => query,
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  return query;
}

function contextByTable(
  tables: Record<string, { data: unknown; error: unknown }>
): ToolContext {
  return {
    client: {
      from: (table: string) => chain(tables[table]),
    } as unknown as ToolContext["client"],
    user: { id: "user-1" } as unknown as ToolContext["user"],
    clientId: null,
  };
}

function createdHoursAgo(hours: number): { created_at: string } {
  return { created_at: new Date(NOW.getTime() - hours * HOUR).toISOString() };
}

/** The query orders ascending, so the first row is the oldest — the one that frees a slot first. */
function rowsOldestFirst(count: number): { created_at: string }[] {
  return Array.from({ length: count }, (_, index) =>
    createdHoursAgo(count - 1 - index)
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("checkEventCreationBudget", () => {
  it("does not count events when the host owns none", async () => {
    const from = vi.fn(() => chain({ data: [], error: null }));
    const ctx: ToolContext = {
      client: { from } as unknown as ToolContext["client"],
      user: { id: "user-1" } as unknown as ToolContext["user"],
      clientId: null,
    };

    await expect(checkEventCreationBudget(ctx)).resolves.toBeUndefined();
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("allows a ninth celebration inside the window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    const ctx = contextByTable({
      event_members: { data: [{ event_id: "e1" }], error: null },
      events: { data: rowsOldestFirst(MAX_EVENTS_PER_DAY - 1), error: null },
    });

    await expect(checkEventCreationBudget(ctx)).resolves.toBeUndefined();
  });

  it("refuses a tenth-owned host and says when a slot frees up", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    const ctx = contextByTable({
      event_members: { data: [{ event_id: "e1" }], error: null },
      events: { data: rowsOldestFirst(MAX_EVENTS_PER_DAY), error: null },
    });

    // The oldest of the ten drops out of the window one full window after it was created.
    const oldest = new Date(NOW.getTime() - (MAX_EVENTS_PER_DAY - 1) * HOUR);
    const resetAt = new Date(
      oldest.getTime() + EVENT_CREATION_WINDOW_MS
    ).toISOString();

    await expect(checkEventCreationBudget(ctx)).rejects.toThrow(
      `Daily limit reached: you have created ${MAX_EVENTS_PER_DAY} celebrations in the last 24 hours. You can create another after ${resetAt}.`
    );
  });

  it("fails closed when ownership cannot be read", async () => {
    const ctx = contextByTable({
      event_members: { data: null, error: { message: "connection reset" } },
    });

    await expect(checkEventCreationBudget(ctx)).rejects.toThrow(
      new ToolError(
        "Could not check your recent celebrations. Nothing was created."
      )
    );
  });

  it("fails closed when the recent celebrations cannot be counted", async () => {
    const ctx = contextByTable({
      event_members: { data: [{ event_id: "e1" }], error: null },
      events: { data: null, error: { message: "connection reset" } },
    });

    await expect(checkEventCreationBudget(ctx)).rejects.toThrow(
      "Could not check your recent celebrations. Nothing was created."
    );
  });
});
