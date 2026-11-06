import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import {
  createTableAction,
  deleteTableAction,
  saveHallLayoutAction,
  saveTablePositionsAction,
} from "./actions";

const mockedCreateClient = vi.mocked(createClient);

const EVENT_ID = "22222222-2222-4222-8222-222222222222";
const NOT_A_MEMBER = "This celebration could not be found.";

const NEW_TABLE = {
  name: "Table 01",
  capacity: 8,
  shape: "round" as const,
  position_x: 100,
  position_y: 100,
};

/** The smallest layout `hallLayoutSchema` accepts, so the gate is what these tests exercise. */
const LAYOUT = {
  version: 2,
  venue: { type: "hall", environment: "indoor" },
  width: 20,
  length: 15,
  spacing: "comfortable",
  zones: [],
  decor: {
    linen: "#6e1426",
    sash: "#e9c98a",
    chair: "chiavari-gold",
    cover: "#f4efe6",
    centrepiece: "tall",
    flower: "#f4efe6",
    uplight: "#f2b45c",
    drape: "#f4efe6",
    floor: "marble",
    wall: "#efe7da",
  },
  rotations: {},
  tableStyles: {},
  chairs: [],
  mood: "evening",
  chandeliers: true,
  ceiling: 5,
};

/**
 * A client that answers `is_event_member` with `member`, and whose table writes always succeed —
 * so a failure in these tests can only come from the membership gate, not from RLS.
 */
function fakeClient(member: boolean) {
  const rpc = vi.fn().mockResolvedValue({ data: member, error: null });
  const chain = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "t1" }, error: null }),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve),
  };
  return { rpc, from: vi.fn(() => chain), chain };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("seating actions re-check event membership", () => {
  const writes = [
    {
      name: "createTableAction",
      call: () => createTableAction(EVENT_ID, NEW_TABLE),
    },
    {
      name: "deleteTableAction",
      call: () => deleteTableAction(EVENT_ID, "t1"),
    },
    {
      name: "saveHallLayoutAction",
      call: () => saveHallLayoutAction(EVENT_ID, LAYOUT),
    },
    {
      name: "saveTablePositionsAction",
      call: () => saveTablePositionsAction(EVENT_ID, []),
    },
  ];

  for (const { name, call } of writes) {
    it(`${name} refuses a caller outside the event without touching a table`, async () => {
      const client = fakeClient(false);
      mockedCreateClient.mockResolvedValue(client as never);

      const result = await call();

      expect(result).toEqual({ ok: false, error: NOT_A_MEMBER });
      expect(client.rpc).toHaveBeenCalledWith("is_event_member", {
        p_event_id: EVENT_ID,
      });
      expect(client.from).not.toHaveBeenCalled();
    });
  }

  it("lets a member through to the write", async () => {
    const client = fakeClient(true);
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await createTableAction(EVENT_ID, NEW_TABLE);

    expect(result.ok).toBe(true);
    expect(client.from).toHaveBeenCalledWith("tables");
  });

  it("treats an rpc error as not a member rather than as success", async () => {
    const client = fakeClient(true);
    client.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await deleteTableAction(EVENT_ID, "t1");

    expect(result).toEqual({ ok: false, error: NOT_A_MEMBER });
    expect(client.from).not.toHaveBeenCalled();
  });
});
