import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../guard";
import { registerProposalTools } from "./proposals";
import { MAX_PROPOSAL_GUESTS } from "../schemas";
import { sendGuestInvitationEmailAction } from "@/features/invitations/actions";
import { sendBatchReminderAction } from "@/features/reminders/actions";
import { dispatchRsvpEmail } from "@/lib/email/dispatcher";

/*
 * The tools under test are the ones that must never send. Mocking the sending paths means a future
 * edit that reaches for one fails here rather than in production with a host's guests.
 */
vi.mock("@/features/invitations/actions", () => ({
  sendGuestInvitationEmailAction: vi.fn(),
}));
vi.mock("@/features/reminders/actions", () => ({
  sendBatchReminderAction: vi.fn(),
}));
vi.mock("@/lib/email/dispatcher", () => ({ dispatchRsvpEmail: vi.fn() }));

const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_EVENT_ID = "99999999-9999-4999-8999-999999999999";
const CLIENT_ID = "client-abc";
const GUEST_A = "22222222-2222-4222-8222-222222222222";
const GUEST_B = "33333333-3333-4333-8333-333333333333";

const OUT_OF_SCOPE =
  "This connection is not set up to reach that celebration. Change which celebrations it can see in Àríyá, under Connect your AI.";
const READ_ONLY =
  "This connection is read-only, so it cannot make changes. Switch that off in Àríyá, under Connect your AI.";

type Row = { data?: unknown; error?: unknown; count?: number };
type Query = Record<string, unknown>;

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
 * A stand-in for the Supabase client that answers per table and remembers what was asked of it, so
 * a test can say both "it returned this" and "it only ever touched these tables".
 */
function fakeClient(
  options: {
    tables?: Record<string, Row>;
    rpc?: Record<string, { data?: unknown; error?: unknown }>;
  } = {}
) {
  const tables = new Map<string, TableLog>();
  const rpcNames: string[] = [];

  const logFor = (table: string): TableLog => {
    const existing = tables.get(table);
    if (existing) return existing;
    const created: TableLog = { queries: [], inserts: [] };
    tables.set(table, created);
    return created;
  };

  const builder = (table: string): Query => {
    const log = logFor(table);
    const result = options.tables?.[table] ?? { data: null, error: null };
    const query: Query = {};

    for (const method of READ_METHODS) {
      query[method] = (...args: unknown[]) => {
        log.queries.push({ method, args });
        return query;
      };
    }

    query.insert = (payload: unknown) => {
      log.inserts.push(payload);
      return query;
    };
    query.single = () => Promise.resolve(result);
    query.maybeSingle = () => Promise.resolve(result);
    query.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve);

    return query;
  };

  const client = {
    from: (table: string) => builder(table),
    rpc: (name: string) => {
      rpcNames.push(name);
      return Promise.resolve(
        options.rpc?.[name] ?? { data: null, error: null }
      );
    },
  };

  return { client, tables, rpcNames, logFor };
}

/** What a connection that may do this looks like: in scope, not read-only, write role. */
const ALLOWED_RPC = {
  ai_connection_event_allowed: { data: true, error: null },
  ai_connection_read_only: { data: false, error: null },
  has_event_role: { data: true, error: null },
};

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

  registerProposalTools({ registerTool } as unknown as McpServer, ctx);
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
});

describe("propose_send_invitations", () => {
  it("records a pending proposal for the guests it could reach", async () => {
    const { client, logFor } = fakeClient({
      tables: {
        guests: { data: [{ id: GUEST_A }, { id: GUEST_B }], error: null },
        ai_proposals: {
          data: {
            id: "proposal-1",
            title: "Send invitations",
            summary: "Send invitations by email to 2 guests.",
            expires_at: "2026-11-08T12:00:00.000Z",
          },
          error: null,
        },
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_send_invitations", {
      eventId: EVENT_ID,
      guestIds: [GUEST_A, GUEST_B],
      note: "The list from my mother arrived late.",
    });

    expect(result.isError).toBeUndefined();
    expect(jsonOf(result)).toMatchObject({
      proposalId: "proposal-1",
      kind: "send_invitations",
      guestCount: 2,
      status: "pending",
      approvalsUrl: "/approvals",
      awaitingApproval:
        "Awaiting your approval in Àríyá. Nothing has been sent.",
    });

    const [inserted] = logFor("ai_proposals").inserts as Record<
      string,
      unknown
    >[];
    expect(inserted).toMatchObject({
      user_id: "user-1",
      event_id: EVENT_ID,
      client_id: CLIENT_ID,
      kind: "send_invitations",
      title: "Send invitations",
    });
    expect(inserted.payload).toEqual({
      guestIds: [GUEST_A, GUEST_B],
      note: "The list from my mother arrived late.",
      requestedCount: 2,
    });
  });

  it("proposes only guests who have no invitation and have an email", async () => {
    const { client, logFor } = fakeClient({
      tables: {
        guests: { data: [{ id: GUEST_A }], error: null },
        ai_proposals: { data: { id: "p" }, error: null },
      },
      rpc: ALLOWED_RPC,
    });

    await call(context(client), "propose_send_invitations", {
      eventId: EVENT_ID,
    });

    const guestQueries = logFor("guests").queries;
    expect(guestQueries.map((entry) => entry.method)).toContain("not");
    expect(guestQueries.find((entry) => entry.method === "is")?.args).toEqual([
      "invited_at",
      null,
    ]);
  });

  it("proposes nothing, and writes nothing, when everyone is already invited", async () => {
    const { client, logFor } = fakeClient({
      tables: { guests: { data: [], error: null } },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_send_invitations", {
      eventId: EVENT_ID,
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(
      "Everyone on this celebration has been invited already, or has no email address. Nothing was proposed."
    );
    expect(logFor("ai_proposals").inserts).toEqual([]);
  });

  it("refuses a read-only connection in the words of the setting that caused it", async () => {
    const { client, logFor } = fakeClient({
      rpc: { ...ALLOWED_RPC, ai_connection_read_only: { data: true } },
    });

    const result = await call(context(client), "propose_send_invitations", {
      eventId: EVENT_ID,
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(READ_ONLY);
    expect(logFor("ai_proposals").inserts).toEqual([]);
  });

  it("refuses a celebration outside the connection's scope", async () => {
    const { client, logFor } = fakeClient({
      rpc: {
        ...ALLOWED_RPC,
        ai_connection_event_allowed: { data: false },
      },
    });

    const result = await call(context(client), "propose_send_invitations", {
      eventId: OTHER_EVENT_ID,
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(OUT_OF_SCOPE);
    expect(logFor("ai_proposals").inserts).toEqual([]);
  });

  it("sends a first-party session to the page that can actually send", async () => {
    const { client, tables } = fakeClient({ rpc: ALLOWED_RPC });

    const result = await call(
      context(client, null),
      "propose_send_invitations",
      { eventId: EVENT_ID }
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("send it directly from");
    // No proposal is attempted on behalf of the host's own session.
    expect(tables.get("ai_proposals")).toBeUndefined();
  });

  it("passes a limit through but replaces a policy refusal with a neutral answer", async () => {
    const limited = fakeClient({
      tables: {
        guests: { data: [{ id: GUEST_A }], error: null },
        ai_proposals: {
          error: {
            message: "You already have 20 proposals waiting.",
            hint: "PENDING_LIMIT",
          },
        },
      },
      rpc: ALLOWED_RPC,
    });

    const limitResult = await call(
      context(limited.client),
      "propose_send_invitations",
      { eventId: EVENT_ID }
    );
    expect(textOf(limitResult)).toBe("You already have 20 proposals waiting.");

    const refused = fakeClient({
      tables: {
        guests: { data: [{ id: GUEST_A }], error: null },
        ai_proposals: {
          error: {
            message:
              'new row violates row-level security policy for table "ai_proposals"',
          },
        },
      },
      rpc: ALLOWED_RPC,
    });

    const refusedResult = await call(
      context(refused.client),
      "propose_send_invitations",
      { eventId: EVENT_ID }
    );
    expect(textOf(refusedResult)).toBe(
      "Could not record that proposal. Nothing was sent."
    );
  });

  it("refuses to propose more than one card can hold, and writes nothing", async () => {
    const everyone = Array.from(
      { length: MAX_PROPOSAL_GUESTS + 1 },
      (_, index) => ({
        id: `22222222-2222-4222-8222-${String(index + 1).padStart(12, "0")}`,
      })
    );
    const { client, logFor } = fakeClient({
      tables: { guests: { data: everyone, error: null } },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_send_invitations", {
      eventId: EVENT_ID,
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(
      `That would email ${MAX_PROPOSAL_GUESTS + 1} guests, and one proposal may cover ${MAX_PROPOSAL_GUESTS}. Narrow it with guestIds and propose again. Nothing was sent.`
    );
    expect(logFor("ai_proposals").inserts).toEqual([]);
  });

  it("never reaches the sending code, whatever it proposes", async () => {
    const { client, tables } = fakeClient({
      tables: {
        guests: { data: [{ id: GUEST_A }], error: null },
        ai_proposals: { data: { id: "proposal-1" }, error: null },
      },
      rpc: ALLOWED_RPC,
    });

    await call(context(client), "propose_send_invitations", {
      eventId: EVENT_ID,
      guestIds: [GUEST_A],
    });

    expect(sendGuestInvitationEmailAction).not.toHaveBeenCalled();
    expect(sendBatchReminderAction).not.toHaveBeenCalled();
    expect(dispatchRsvpEmail).not.toHaveBeenCalled();
    // A reading of guests, one insert into proposals, and the audit row every call leaves behind:
    // nothing was updated or removed, and no sending path was reached.
    expect([...tables.keys()].sort()).toEqual([
      "ai_activity_log",
      "ai_proposals",
      "guests",
    ]);
    expect(tables.get("ai_proposals")?.inserts).toHaveLength(1);
    expect(tables.get("ai_activity_log")?.inserts).toHaveLength(1);
  });
});

describe("propose_send_reminders", () => {
  it("does not narrow by invitation, and says how many would be reminded", async () => {
    const { client, logFor } = fakeClient({
      tables: {
        guests: { data: [{ id: GUEST_A }, { id: GUEST_B }], error: null },
        ai_proposals: {
          data: {
            id: "proposal-2",
            title: "Send reminders",
            summary: "Send reminder emails to 2 guests.",
            expires_at: "2026-11-08T12:00:00.000Z",
          },
          error: null,
        },
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_send_reminders", {
      eventId: EVENT_ID,
    });

    expect(jsonOf(result)).toMatchObject({
      kind: "send_reminders",
      guestCount: 2,
    });

    expect(
      logFor("guests").queries.some(
        (entry) => entry.method === "is" && entry.args[0] === "invited_at"
      )
    ).toBe(false);

    expect(logFor("ai_proposals").inserts[0]).toMatchObject({
      kind: "send_reminders",
      title: "Send reminders",
    });
    expect(sendBatchReminderAction).not.toHaveBeenCalled();
  });

  it("proposes nothing when nobody has an email address", async () => {
    const { client, logFor } = fakeClient({
      tables: { guests: { data: [], error: null } },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "propose_send_reminders", {
      eventId: EVENT_ID,
    });

    expect(textOf(result)).toBe(
      "Nobody on this celebration has an email address, so there is no one to remind. Nothing was proposed."
    );
    expect(logFor("ai_proposals").inserts).toEqual([]);
  });
});

describe("list_my_proposals", () => {
  it("reports the guest count from the payload and reads nothing else", async () => {
    const { client, tables } = fakeClient({
      tables: {
        ai_proposals: {
          data: [
            {
              id: "proposal-1",
              kind: "send_invitations",
              title: "Send invitations",
              summary: "…",
              payload: { guestIds: [GUEST_A, GUEST_B] },
              status: "pending",
              event_id: EVENT_ID,
              created_at: "2026-11-01T12:00:00.000Z",
              decided_at: null,
              expires_at: "2026-11-08T12:00:00.000Z",
            },
          ],
          error: null,
          count: 1,
        },
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "list_my_proposals", {});

    expect(
      jsonOf<{ items: { guestCount: number }[] }>(result).items[0]
    ).toMatchObject({ guestCount: 2, status: "pending" });
    expect(tables.get("ai_proposals")?.inserts).toEqual([]);
  });

  it("checks read access when the list is narrowed to one celebration", async () => {
    const { client, rpcNames } = fakeClient({
      tables: { ai_proposals: { data: [], error: null, count: 0 } },
      rpc: ALLOWED_RPC,
    });

    await call(context(client), "list_my_proposals", { eventId: EVENT_ID });

    expect(rpcNames).toContain("has_event_role");
  });

  it("fails closed when proposals cannot be read", async () => {
    const { client } = fakeClient({
      tables: {
        ai_proposals: { data: null, error: { message: "connection reset" } },
      },
      rpc: ALLOWED_RPC,
    });

    const result = await call(context(client), "list_my_proposals", {});

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(
      "Could not read your proposals right now. Nothing was changed."
    );
  });
});
