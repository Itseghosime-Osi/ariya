import { describe, it, expect, vi, afterEach } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../guard";
import { ToolError } from "../result";
import {
  checkEventCreationBudget,
  EVENT_CREATION_WINDOW_MS,
  MAX_EVENTS_PER_DAY,
  registerWriteTools,
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
    maybeSingle: () => Promise.resolve(result),
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

describe("a write tool the database refuses", () => {
  const ALLOWED_RPC = {
    ai_connection_event_allowed: { data: true, error: null },
    ai_connection_read_only: { data: false, error: null },
    has_event_role: { data: true, error: null },
  };

  /** The driver's error, with a message and details that must not survive the trip. */
  const REFUSED = {
    code: "42501",
    hint: "NOT_PERMITTED",
    message: 'new row violates row-level security policy for table "guests"',
    details: "Failing row contains (Ngozi Eze, +2348030000000).",
  };

  function toolClient(rows: Record<string, { data: unknown; error: unknown }>) {
    const inserts: unknown[] = [];
    const client = {
      from: (table: string) => {
        const query = chain(rows[table] ?? { data: null, error: null });
        return {
          ...query,
          insert: (payload: unknown) => {
            inserts.push(payload);
            return query;
          },
        };
      },
      rpc: (name: string) =>
        Promise.resolve(
          ALLOWED_RPC[name as keyof typeof ALLOWED_RPC] ?? {
            data: null,
            error: null,
          }
        ),
    };

    return { client, inserts };
  }

  async function callUpdateGuest(ctx: ToolContext): Promise<CallToolResult> {
    let handler:
      ((args: Record<string, unknown>) => Promise<CallToolResult>) | null =
      null;
    registerWriteTools(
      {
        registerTool: (
          name: string,
          _config: unknown,
          body: (args: Record<string, unknown>) => Promise<CallToolResult>
        ) => {
          if (name === "update_guest") handler = body;
          return { enabled: true };
        },
      } as unknown as McpServer,
      ctx
    );

    if (!handler) throw new Error("update_guest was not registered");
    return (
      handler as (args: Record<string, unknown>) => Promise<CallToolResult>
    )({
      eventId: "11111111-1111-4111-8111-111111111111",
      guestId: "22222222-2222-4222-8222-222222222222",
      name: "Ngozi Eze",
    });
  }

  it("logs the code and hint, and never the message or the row", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { client, inserts } = toolClient({
      guests: { data: null, error: REFUSED },
    });

    const result = await callUpdateGuest({
      client: client as unknown as ToolContext["client"],
      user: { id: "user-1" } as unknown as ToolContext["user"],
      clientId: "client-abc",
    });

    const text =
      result.content?.[0]?.type === "text" ? result.content[0].text : "";
    expect(text).toBe(
      "Could not read that guest right now. Nothing was changed."
    );
    expect(text).not.toContain("policy");
    expect(text).not.toContain("Ngozi");

    const line = info.mock.calls
      .map(([entry]) => JSON.parse(String(entry)))
      .find((entry) => entry.event === "mcp_tool_call");
    expect(line).toMatchObject({
      tool: "update_guest",
      outcome: "error",
      code: "42501",
      hint: "NOT_PERMITTED",
    });
    expect(JSON.stringify(line)).not.toContain("Ngozi");

    expect(inserts).toContainEqual(
      expect.objectContaining({
        tool: "update_guest",
        outcome: "error",
        note: "Updated guest (42501 NOT_PERMITTED)",
      })
    );
  });
});
