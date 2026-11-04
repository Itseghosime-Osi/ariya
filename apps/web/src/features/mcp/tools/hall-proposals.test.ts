import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../guard";
import { registerHallProposalTools } from "./hall-proposals";

const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "client-abc";
const TABLE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TABLE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TABLE_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const GUEST_A = "22222222-2222-4222-8222-222222222222";
const GUEST_B = "33333333-3333-4333-8333-333333333333";
const MISSING_TABLE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const OUT_OF_SCOPE =
  "This connection is not set up to reach that celebration. Change which celebrations it can see in Àríyá, under Connect your AI.";
const READ_ONLY =
  "This connection is read-only, so it cannot make changes. Switch that off in Àríyá, under Connect your AI.";

type Row = { data?: unknown; error?: unknown };
interface TableLog {
  queries: { method: string; args: unknown[] }[];
  inserts: unknown[];
}

const READ_METHODS = [
  "select",
  "eq",
  "in",
  "not",
  "is",
  "order",
  "range",
] as const;

/**
 * The smallest stand-in for the Supabase client these tools use: answers per table, remembers every
 * insert, and never touches a database.
 */
function fakeClient(
  options: {
    rows?: Record<string, Row>;
    rpc?: Record<string, Row>;
  } = {}
) {
  const tables = new Map<string, TableLog>();

  const logFor = (table: string): TableLog => {
    const existing = tables.get(table);
    if (existing) return existing;
    const created: TableLog = { queries: [], inserts: [] };
    tables.set(table, created);
    return created;
  };

  const builder = (table: string) => {
    const log = logFor(table);
    const result = options.rows?.[table] ?? { data: null, error: null };
    const query: Record<string, unknown> = {};

    for (const method of READ_METHODS) {
      query[method] = (...args: unknown[]) => {
        log.queries.push({ method, args });
        return query;
      };
    }

    let inserted: Record<string, unknown> | null = null;

    query.insert = (payload: unknown) => {
      log.inserts.push(payload);
      inserted = payload as Record<string, unknown>;
      return query;
    };
    // An insert reads back what was written, as the real database does, so a test can
    // assert the copy the tool chose rather than one the test itself supplied.
    query.single = () =>
      Promise.resolve(
        inserted && !result.error
          ? {
              data: {
                id: "99999999-9999-4999-8999-999999999999",
                expires_at: "2026-11-08T00:00:00.000Z",
                ...inserted,
              },
              error: null,
            }
          : result
      );
    query.maybeSingle = () => Promise.resolve(result);
    query.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve);

    return query;
  };

  const client = {
    from: (table: string) => builder(table),
    rpc: (name: string) =>
      Promise.resolve(options.rpc?.[name] ?? { data: null, error: null }),
  };

  return { client, logFor };
}

/** A connection that may do this: in scope, not read-only, write role. */
const ALLOWED_RPC = {
  ai_connection_event_allowed: { data: true, error: null },
  ai_connection_read_only: { data: false, error: null },
  has_event_role: { data: true, error: null },
};

const TABLES = [
  {
    id: TABLE_A,
    name: "Table 1",
    capacity: 8,
    shape: "round",
    position_x: 500,
    position_y: 1500,
  },
  {
    id: TABLE_B,
    name: "Table 2",
    capacity: 8,
    shape: "round",
    position_x: 1500,
    position_y: 1500,
  },
];

function guests(rows: unknown[]) {
  return { guests: { data: rows, error: null } };
}

const UNSEATED = [
  {
    id: GUEST_A,
    name: "The Adeyemi family",
    party_size: 2,
    seat_assignments: [],
  },
  { id: GUEST_B, name: "Ada Obi", party_size: 1, seat_assignments: [] },
];

/** A layout the designer would accept: two tables, well inside the walls, nothing between them. */
function layout(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    width: 20,
    length: 30,
    spacing: "comfortable",
    zones: [],
    decor: {
      linen: "#f5f0e1",
      sash: null,
      chair: "chiavari-gold",
      cover: "#ffffff",
      centrepiece: "low",
      flower: "#ffffff",
      uplight: null,
      drape: null,
      floor: "wood",
      wall: "#f0e6d2",
    },
    rotations: {},
    tableStyles: {},
    chairs: [],
    mood: "evening",
    chandeliers: true,
    ceiling: 4,
    ...overrides,
  };
}

const POSITIONS = [
  { id: TABLE_A, x: 500, y: 1500 },
  { id: TABLE_B, x: 1500, y: 1500 },
];

function context(
  client: unknown,
  clientId: string | null = CLIENT_ID
): ToolContext {
  return {
    client: client as ToolContext["client"],
    user: { id: "user-1" } as unknown as ToolContext["user"],
    clientId,
  };
}

type ToolHandler = (args: Record<string, unknown>) => Promise<CallToolResult>;

async function call(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown> = {}
): Promise<CallToolResult> {
  const handlers = new Map<string, ToolHandler>();
  registerHallProposalTools(
    {
      registerTool: (tool: string, _config: unknown, handler: ToolHandler) => {
        handlers.set(tool, handler);
        return { enabled: true };
      },
    } as unknown as McpServer,
    ctx
  );

  const handler = handlers.get(name);
  if (!handler) throw new Error(`${name} was never registered`);
  return handler(args);
}

function textOf(result: CallToolResult): string {
  const first = result.content?.[0];
  return first && first.type === "text" ? first.text : "";
}

function jsonOf<T>(result: CallToolResult): T {
  return JSON.parse(textOf(result)) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("propose_hall_layout", () => {
  it("records a complete room as a pending proposal", async () => {
    const { client, logFor } = fakeClient({
      rows: {
        events: { data: { status: "active" }, error: null },
        tables: { data: TABLES, error: null },
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_hall_layout", {
      eventId: EVENT_ID,
      layout: layout(),
      tablePositions: POSITIONS,
      note: "An elegant feel, with room to dance.",
    });

    const body = jsonOf<{
      kind: string;
      title: string;
      summary: string;
      status: string;
      counts: Record<string, number>;
    }>(result);

    expect(body).toMatchObject({
      kind: "apply_hall_layout",
      title: "Design the hall",
      summary:
        "A 20 m × 30 m room with 0 zones, 2 tables placed, comfortable spacing.",
      status: "pending",
      counts: { tableCount: 2, zoneCount: 0 },
    });

    const inserted = logFor("ai_proposals").inserts[0] as {
      payload: { layout: { width: number }; tablePositions: unknown[] };
      kind: string;
    };
    expect(inserted.kind).toBe("apply_hall_layout");
    expect(inserted.payload.layout.width).toBe(20);
    expect(inserted.payload.tablePositions).toHaveLength(2);
  });

  it("refuses a celebration that is archived", async () => {
    const { client, logFor } = fakeClient({
      rows: {
        events: { data: { status: "archived" }, error: null },
        tables: { data: TABLES, error: null },
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_hall_layout", {
      eventId: EVENT_ID,
      layout: layout(),
      tablePositions: POSITIONS,
    });

    expect(textOf(result)).toContain("archived");
    expect(textOf(result)).toContain("Nothing was changed.");
    expect(logFor("ai_proposals").inserts).toHaveLength(0);
  });

  it("refuses a connection that is out of scope for the celebration", async () => {
    const { client, logFor } = fakeClient({
      rows: { events: { data: { status: "active" }, error: null } },
      rpc: {
        ...ALLOWED_RPC,
        ai_connection_event_allowed: { data: false, error: null },
      },
    });

    const result = await call(context(client), "propose_hall_layout", {
      eventId: EVENT_ID,
      layout: layout(),
      tablePositions: POSITIONS,
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(OUT_OF_SCOPE);
    expect(logFor("ai_proposals").inserts).toHaveLength(0);
  });

  it("refuses a read-only connection", async () => {
    const { client, logFor } = fakeClient({
      rows: { events: { data: { status: "active" }, error: null } },
      rpc: {
        ...ALLOWED_RPC,
        ai_connection_read_only: { data: true, error: null },
      },
    });

    const result = await call(context(client), "propose_hall_layout", {
      eventId: EVENT_ID,
      layout: layout(),
      tablePositions: POSITIONS,
    });

    expect(textOf(result)).toBe(READ_ONLY);
    expect(logFor("ai_proposals").inserts).toHaveLength(0);
  });

  it("refuses a table belonging to another celebration", async () => {
    const { client, logFor } = fakeClient({
      rows: {
        events: { data: { status: "active" }, error: null },
        tables: { data: TABLES, error: null },
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_hall_layout", {
      eventId: EVENT_ID,
      layout: layout(),
      tablePositions: [...POSITIONS, { id: MISSING_TABLE, x: 1000, y: 1000 }],
    });

    expect(textOf(result)).toContain(
      `Table ${MISSING_TABLE} is not on this celebration`
    );
    expect(logFor("ai_proposals").inserts).toHaveLength(0);
  });

  it("refuses two tables on the same spot", async () => {
    const { client, logFor } = fakeClient({
      rows: {
        events: { data: { status: "active" }, error: null },
        tables: { data: TABLES, error: null },
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_hall_layout", {
      eventId: EVENT_ID,
      layout: layout(),
      tablePositions: [
        { id: TABLE_A, x: 500, y: 1500 },
        { id: TABLE_B, x: 500, y: 1500 },
      ],
    });

    expect(textOf(result)).toContain("overlaps table");
    expect(textOf(result)).toContain("Correct these and propose again.");
    expect(logFor("ai_proposals").inserts).toHaveLength(0);
  });

  it("refuses a table that would stand outside the hall", async () => {
    const { client } = fakeClient({
      rows: {
        events: { data: { status: "active" }, error: null },
        tables: { data: TABLES, error: null },
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_hall_layout", {
      eventId: EVENT_ID,
      layout: layout(),
      tablePositions: [
        { id: TABLE_A, x: -200, y: 1500 },
        { id: TABLE_B, x: 1500, y: 1500 },
      ],
    });

    expect(textOf(result)).toContain("reaches outside the hall");
  });

  it("refuses a table that blocks the main aisle", async () => {
    const { client } = fakeClient({
      rows: {
        events: { data: { status: "active" }, error: null },
        tables: {
          data: [
            ...TABLES,
            {
              id: TABLE_C,
              name: "Table 3",
              capacity: 8,
              shape: "round",
              position_x: 1000,
              position_y: 1500,
            },
          ],
          error: null,
        },
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_hall_layout", {
      eventId: EVENT_ID,
      layout: layout(),
      tablePositions: [
        { id: TABLE_A, x: 400, y: 1500 },
        { id: TABLE_C, x: 1000, y: 1500 },
        { id: TABLE_B, x: 1600, y: 1500 },
      ],
    });

    expect(textOf(result)).toContain("blocks the main aisle");
  });

  it("refuses a room too large to store", async () => {
    const { client, logFor } = fakeClient({
      rows: {
        events: { data: { status: "active" }, error: null },
        tables: { data: [], error: null },
      },
      rpc: ALLOWED_RPC,
    });

    const chairs = Array.from({ length: 400 }, (_, index) => ({
      id: `chair-${String(index).padStart(4, "0")}-${"x".repeat(24)}`,
      x: 0.1234567890123456,
      y: -0.1234567890123456,
      rot: -359.99999999,
      chair: "chiavari-silver",
    }));
    const zones = Array.from({ length: 60 }, (_, index) => ({
      id: `zone-${index}`,
      kind: "entrance",
      label: "x".repeat(60),
      x: 0.1234567890123456,
      y: 0.1234567890123456,
      w: 120,
      h: 120,
      shape: "hexagon",
    }));

    const result = await call(context(client), "propose_hall_layout", {
      eventId: EVENT_ID,
      layout: layout({ chairs, zones }),
      tablePositions: [],
    });

    expect(textOf(result)).toContain("a hall may be at most 64 KB");
    expect(logFor("ai_proposals").inserts).toHaveLength(0);
  });

  it("reports the database's refusal without recording anything", async () => {
    const { client, logFor } = fakeClient({
      rows: {
        events: { data: { status: "active" }, error: null },
        tables: { data: TABLES, error: null },
        ai_proposals: {
          error: {
            code: "42501",
            hint: "NOT_PERMITTED",
            message:
              'new row violates row-level security policy for table "ai_proposals"',
          },
        },
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_hall_layout", {
      eventId: EVENT_ID,
      layout: layout(),
      tablePositions: POSITIONS,
    });

    expect(textOf(result)).toBe(
      "Could not record that proposal. Nothing was changed."
    );
    expect(textOf(result)).not.toContain("row-level");
    expect(logFor("ai_proposals").inserts).toHaveLength(1);
  });
});

describe("propose_seating_plan", () => {
  it("seats guests who have no table and says how many", async () => {
    const { client, logFor } = fakeClient({
      rows: {
        events: { data: { status: "active" }, error: null },
        tables: { data: TABLES, error: null },
        ...guests(UNSEATED),
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_seating_plan", {
      eventId: EVENT_ID,
      assignments: [
        { guestId: GUEST_A, tableId: TABLE_A },
        { guestId: GUEST_B, tableId: TABLE_B },
      ],
    });

    const body = jsonOf<{
      kind: string;
      title: string;
      summary: string;
      counts: Record<string, number>;
    }>(result);

    expect(body).toMatchObject({
      kind: "apply_seating_plan",
      title: "Seat guests",
      summary: "Seats 2 guests across 2 tables. Nobody already seated moves.",
      counts: { seatedCount: 2, movedCount: 0, tableCount: 2 },
    });
    expect(logFor("ai_proposals").inserts[0]).toMatchObject({
      payload: { mode: "fill_unseated" },
    });
  });

  it("never moves a guest who is already seated in fill_unseated", async () => {
    const { client, logFor } = fakeClient({
      rows: {
        events: { data: { status: "active" }, error: null },
        tables: { data: TABLES, error: null },
        ...guests([
          {
            id: GUEST_A,
            name: "The Adeyemi family",
            party_size: 2,
            seat_assignments: [{ table_id: TABLE_B }],
          },
        ]),
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_seating_plan", {
      eventId: EVENT_ID,
      assignments: [{ guestId: GUEST_A, tableId: TABLE_A }],
    });

    expect(textOf(result)).toContain(
      "is already seated. Use the rearrange mode"
    );
    expect(logFor("ai_proposals").inserts).toHaveLength(0);
  });

  it("moves a seated guest when the host asked to rearrange", async () => {
    const { client, logFor } = fakeClient({
      rows: {
        events: { data: { status: "active" }, error: null },
        tables: { data: TABLES, error: null },
        ...guests([
          {
            id: GUEST_A,
            name: "The Adeyemi family",
            party_size: 2,
            seat_assignments: [{ table_id: TABLE_B }],
          },
        ]),
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_seating_plan", {
      eventId: EVENT_ID,
      mode: "rearrange",
      assignments: [{ guestId: GUEST_A, tableId: TABLE_A }],
    });

    const body = jsonOf<{
      title: string;
      summary: string;
      counts: Record<string, number>;
    }>(result);

    expect(body.title).toBe("Rearrange the seating");
    expect(body.summary).toBe(
      "Rearranges 1 guest across 1 table, moving 1 who is already seated."
    );
    expect(body.counts.movedCount).toBe(1);
    expect(logFor("ai_proposals").inserts[0]).toMatchObject({
      payload: { mode: "rearrange" },
    });
  });

  it("refuses the same guest twice", async () => {
    const { client } = fakeClient({
      rows: {
        events: { data: { status: "active" }, error: null },
        tables: { data: TABLES, error: null },
        ...guests(UNSEATED),
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_seating_plan", {
      eventId: EVENT_ID,
      assignments: [
        { guestId: GUEST_A, tableId: TABLE_A },
        { guestId: GUEST_A, tableId: TABLE_B },
      ],
    });

    expect(textOf(result)).toContain("is in this plan more than once.");
  });

  it("refuses a guest who is not on the celebration", async () => {
    const { client } = fakeClient({
      rows: {
        events: { data: { status: "active" }, error: null },
        tables: { data: TABLES, error: null },
        ...guests(UNSEATED),
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_seating_plan", {
      eventId: EVENT_ID,
      assignments: [
        { guestId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", tableId: TABLE_A },
      ],
    });

    expect(textOf(result)).toContain("is not on this celebration.");
  });

  it("counts a whole party against the table's seats", async () => {
    const { client } = fakeClient({
      rows: {
        events: { data: { status: "active" }, error: null },
        tables: { data: TABLES, error: null },
        ...guests([
          {
            id: GUEST_A,
            name: "The Adeyemi family",
            party_size: 10,
            seat_assignments: [],
          },
        ]),
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_seating_plan", {
      eventId: EVENT_ID,
      assignments: [{ guestId: GUEST_A, tableId: TABLE_A }],
    });

    expect(textOf(result)).toContain("would hold 10 guests but seats 8.");
  });

  it("refuses a seat number the table does not have", async () => {
    const { client } = fakeClient({
      rows: {
        events: { data: { status: "active" }, error: null },
        tables: { data: TABLES, error: null },
        ...guests(UNSEATED),
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_seating_plan", {
      eventId: EVENT_ID,
      assignments: [{ guestId: GUEST_A, tableId: TABLE_A, seatNumber: 9 }],
    });

    expect(textOf(result)).toContain("Seat 9 does not exist");
  });

  it("refuses a plan that seats more than 300 guests", async () => {
    const crowd = Array.from({ length: 301 }, (_, index) => ({
      id: `22222222-2222-4222-8222-${String(index + 1).padStart(12, "0")}`,
      name: `Guest ${index + 1}`,
      party_size: 1,
      seat_assignments: [],
    }));

    const { client } = fakeClient({
      rows: {
        events: { data: { status: "active" }, error: null },
        tables: { data: TABLES, error: null },
        ...guests(crowd),
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_seating_plan", {
      eventId: EVENT_ID,
      assignments: crowd.map((guest) => ({
        guestId: guest.id,
        tableId: TABLE_A,
      })),
    });

    expect(textOf(result)).toContain(
      "A plan may seat 300 guests at a time; this one names 301."
    );
  });
});
