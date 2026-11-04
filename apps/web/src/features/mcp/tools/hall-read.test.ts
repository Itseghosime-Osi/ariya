import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../guard";
import { registerReadTools, UNSEATED_CAP } from "./read";
import {
  HALL_MAX_SIZE,
  HALL_MAX_ZONES,
  MAX_HALL_LAYOUT_BYTES,
  TABLE_POSITION_MAX,
} from "@/features/seating/schemas";
import { defaultLayout } from "@/features/seating/hall/model";
import type { SeatingDeskData } from "@/features/seating/types";

const seatingData = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/features/seating/queries", () => ({
  getEventSeatingData: vi.fn(async () => seatingData.current),
}));

const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const TABLE_A = "44444444-4444-4444-8444-444444444444";

type Row = { data?: unknown; error?: unknown };

function fakeClient(tables: Record<string, Row> = {}) {
  const query = (table: string) => {
    const result = tables[table] ?? { data: null, error: null };
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "not", "is"]) {
      chain[method] = () => chain;
    }
    chain.maybeSingle = () => Promise.resolve(result);
    chain.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve);
    return chain;
  };

  return { from: query };
}

type ToolHandler = (args: Record<string, unknown>) => Promise<CallToolResult>;

function context(
  client: ReturnType<typeof fakeClient>,
  options: { scope?: boolean } = {}
): ToolContext {
  const rpc = async (name: string) => ({
    data:
      name === "ai_connection_event_allowed" ? (options.scope ?? true) : true,
    error: null,
  });

  return {
    client: { ...client, rpc } as unknown as ToolContext["client"],
    user: { id: "user-1" } as unknown as ToolContext["user"],
    clientId: "client-abc",
  };
}

function handlersFor(ctx: ToolContext): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();
  const registerTool = (
    name: string,
    _config: unknown,
    handler: ToolHandler
  ) => {
    handlers.set(name, handler);
    return { enabled: true };
  };

  registerReadTools({ registerTool } as unknown as McpServer, ctx);
  return handlers;
}

async function call(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown> = {}
): Promise<CallToolResult> {
  const handler = handlersFor(ctx).get(name);
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
  seatingData.current = null;
});

describe("get_hall_rules", () => {
  it("states the limits the designer itself validates with", async () => {
    const rules = jsonOf<{
      limits: {
        hall: { maxWidth: number };
        zones: { max: number };
        tables: { positionMax: number };
        payload: { maxBytes: number };
      };
      guidance: string[];
    }>(await call(context(fakeClient()), "get_hall_rules"));

    expect(rules.limits.hall.maxWidth).toBe(HALL_MAX_SIZE);
    expect(rules.limits.zones.max).toBe(HALL_MAX_ZONES);
    expect(rules.limits.tables.positionMax).toBe(TABLE_POSITION_MAX);
    expect(rules.limits.payload.maxBytes).toBe(MAX_HALL_LAYOUT_BYTES);
    expect(rules.guidance.length).toBeGreaterThan(3);
  });

  it("resolves its style starters against presets that exist", async () => {
    const rules = jsonOf<{
      styleStarters: {
        key: string;
        width: number;
        length: number;
        decorKey: string;
      }[];
    }>(await call(context(fakeClient()), "get_hall_rules"));

    expect(rules.styleStarters.map((style) => style.key)).toEqual([
      "classic",
      "garden",
      "modern",
      "intimate",
    ]);
    for (const style of rules.styleStarters) {
      expect(style.width).toBeGreaterThanOrEqual(6);
      expect(style.length).toBeGreaterThanOrEqual(6);
      expect(style.decorKey).toBeTruthy();
    }
  });
});

describe("get_hall_layout", () => {
  it("returns the saved hall with each table's position and rotation", async () => {
    const layout = {
      ...defaultLayout(30, 20),
      rotations: { [TABLE_A]: 45 },
      tableStyles: {},
    };

    const result = await call(
      context(
        fakeClient({
          events: { data: { hall_layout: layout }, error: null },
          tables: {
            data: [
              {
                id: TABLE_A,
                name: "Table 1",
                capacity: 10,
                shape: "round",
                position_x: 2400,
                position_y: 900,
              },
            ],
            error: null,
          },
        })
      ),
      "get_hall_layout",
      { eventId: EVENT_ID }
    );

    const body = jsonOf<{
      source: string;
      hall: { width: number; length: number };
      tables: { tableId: string; rotation: number }[];
    }>(result);

    expect(body.source).toBe("saved");
    expect(body.hall.width).toBe(30);
    expect(body.hall.length).toBe(20);
    expect(body.tables).toEqual([
      {
        tableId: TABLE_A,
        name: "Table 1",
        capacity: 10,
        shape: "round",
        position: { x: 2400, y: 900 },
        rotation: 45,
      },
    ]);
  });

  it("says so, rather than inventing a hall, when nothing has been saved", async () => {
    const result = await call(
      context(
        fakeClient({
          events: { data: { hall_layout: null }, error: null },
          tables: { data: [], error: null },
        })
      ),
      "get_hall_layout",
      { eventId: EVENT_ID }
    );

    const body = jsonOf<{ source: string; notice?: string; tables: unknown[] }>(
      result
    );

    expect(body.source).toBe("default");
    expect(body.tables).toEqual([]);
    expect(body.notice).toContain("no saved hall");
  });

  it("is refused when the connection cannot reach the celebration", async () => {
    const result = await call(
      context(fakeClient(), { scope: false }),
      "get_hall_layout",
      { eventId: EVENT_ID }
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("not set up to reach");
  });
});

describe("list_tables_and_seating", () => {
  function desk(): SeatingDeskData {
    return {
      tables: [
        {
          id: TABLE_A,
          event_id: EVENT_ID,
          name: "Table 1",
          capacity: 10,
          shape: "round",
          position_x: 2400,
          position_y: 900,
          guests: [
            {
              id: "66666666-6666-4666-8666-666666666666",
              name: "Ada",
              side: "Bride",
              group_name: "Family",
              is_vip: true,
              party_size: 2,
              attending_count: 2,
              status: "accepted",
              plus_one_name: null,
              dietary: null,
              table_id: TABLE_A,
            },
          ],
          occupiedSeats: 2,
        } as unknown as SeatingDeskData["tables"][number],
      ],
      unseatedGuests: [
        {
          id: "77777777-7777-4777-8777-777777777777",
          name: "Tunde",
          side: "Groom",
          group_name: "Work",
          is_vip: false,
          party_size: 3,
          attending_count: 3,
          status: "accepted",
          plus_one_name: null,
          dietary: null,
          table_id: null,
        },
      ],
      stats: {
        totalCapacity: 10,
        seatedAttendees: 2,
        unseatedAttendees: 3,
        readinessPct: 40,
      },
    };
  }

  it("shows party sizes, groups and sides on both lists, and no contact details", async () => {
    seatingData.current = desk();

    const result = await call(
      context(fakeClient()),
      "list_tables_and_seating",
      { eventId: EVENT_ID }
    );
    const text = textOf(result);

    const body = jsonOf<{
      tables: {
        seatsFree: number;
        data: { guests: { group: string; partySize: number; side: string }[] };
      }[];
      unseated: { group: string; partySize: number; side: string }[];
      byGroup: { name: string }[];
      bySide: { name: string }[];
      stats: { tables: number; tableCapacity: number };
      truncated: boolean;
    }>(result);

    expect(body.tables[0].seatsFree).toBe(8);
    expect(body.tables[0].data.guests[0]).toMatchObject({
      group: "Family",
      partySize: 2,
      side: "Bride",
    });
    expect(body.unseated[0]).toMatchObject({
      group: "Work",
      partySize: 3,
      side: "Groom",
    });
    // Biggest group first: a plan starts from the largest party, not the alphabet.
    expect(body.byGroup).toEqual([
      { name: "Work", guests: 1, partySize: 3 },
      { name: "Family", guests: 1, partySize: 2 },
    ]);
    expect(body.bySide.map((side) => side.name).sort()).toEqual([
      "Bride",
      "Groom",
    ]);
    expect(body.stats.tables).toBe(1);
    expect(body.stats.tableCapacity).toBe(10);
    expect(body.truncated).toBe(false);

    expect(text).not.toContain("@");
    expect(text.toLowerCase()).not.toContain("phone");
    expect(text.toLowerCase()).not.toContain("email");
  });

  it("lets a plan cover a whole hall of unseated guests", async () => {
    const guests = Array.from({ length: UNSEATED_CAP + 5 }, (_, index) => ({
      id: `88888888-8888-4888-8888-${String(index).padStart(12, "0")}`,
      name: `Guest ${index}`,
      side: "Bride",
      group_name: "Family",
      is_vip: false,
      party_size: 1,
      attending_count: 1,
      status: "accepted" as const,
      plus_one_name: null,
      dietary: null,
      table_id: null,
    }));

    seatingData.current = {
      tables: [],
      unseatedGuests: guests,
      stats: {
        totalCapacity: 0,
        seatedAttendees: 0,
        unseatedAttendees: guests.length,
        readinessPct: 0,
      },
    };

    const body = jsonOf<{ unseated: unknown[]; truncated: boolean }>(
      await call(context(fakeClient()), "list_tables_and_seating", {
        eventId: EVENT_ID,
      })
    );

    expect(body.unseated).toHaveLength(UNSEATED_CAP);
    expect(body.truncated).toBe(true);
  });
});
