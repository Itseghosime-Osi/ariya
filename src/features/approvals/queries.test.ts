import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/features/mcp/grants", () => ({ listConnectedApps: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { listConnectedApps } from "@/features/mcp/grants";
import {
  countPendingProposals,
  listProposalFeed,
  listRecentActivity,
} from "./queries";

const mockedCreateClient = vi.mocked(createClient);
const mockedListConnectedApps = vi.mocked(listConnectedApps);

const EVENT_ID = "22222222-2222-4222-8222-222222222222";
const CLIENT_ID = "client-abc";
const GUEST_A = "33333333-3333-4333-8333-333333333333";
const GUEST_B = "44444444-4444-4444-8444-444444444444";

const SIGNED_OUT = "Sign in to see what your connected apps have asked to do.";
const READ_FAILED = "Could not load your proposals right now.";
const ACTIVITY_FAILED = "Could not load your recent activity right now.";

type Result = { data?: unknown; error?: unknown; count?: number | null };
type ChainCall = { method: string; args: unknown[] };

const READ_CHAIN = [
  "select",
  "eq",
  "in",
  "not",
  "is",
  "gt",
  "order",
  "limit",
] as const;

/**
 * Answers per table and remembers the chain each query walked, so a test can check both the shape
 * the desk receives and the filters that produced it.
 */
function fakeClient(
  options: {
    user?: { id: string } | null;
    tables?: Record<string, Result>;
  } = {}
) {
  const chains: { table: string; calls: ChainCall[] }[] = [];

  const from = (table: string) => {
    const entry: { table: string; calls: ChainCall[] } = { table, calls: [] };
    chains.push(entry);
    const result = options.tables?.[table] ?? { data: null, error: null };

    const query: Record<string, unknown> = {};
    for (const method of READ_CHAIN) {
      query[method] = (...args: unknown[]) => {
        entry.calls.push({ method, args });
        return query;
      };
    }
    query.single = () => Promise.resolve(result);
    query.maybeSingle = () => Promise.resolve(result);
    query.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve);

    return query;
  };

  const client = {
    auth: {
      getUser: async () => ({
        data: {
          user: options.user === undefined ? { id: "user-1" } : options.user,
        },
        error: null,
      }),
    },
    from,
  };

  return {
    client,
    chains,
    callsFor: (table: string) =>
      chains.filter((chain) => chain.table === table).flatMap((c) => c.calls),
  };
}

function install(fake: ReturnType<typeof fakeClient>) {
  mockedCreateClient.mockResolvedValue(
    fake.client as unknown as Awaited<ReturnType<typeof createClient>>
  );
  return fake;
}

function proposalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "proposal-1",
    kind: "send_invitations",
    title: "Send invitations",
    summary: "Send invitations by email to 2 guests.",
    payload: { guestIds: [GUEST_A, GUEST_B] },
    status: "pending",
    result: null,
    event_id: EVENT_ID,
    client_id: CLIENT_ID,
    created_at: "2026-11-01T10:00:00.000Z",
    decided_at: null,
    expires_at: "2099-01-01T00:00:00.000Z",
    events: { title: "The Nuptials" },
    ...overrides,
  };
}

function connectedTo(clientId: string, name: string) {
  mockedListConnectedApps.mockResolvedValue({
    ok: true,
    data: [
      {
        clientId,
        name,
        logoUrl: null,
        website: null,
        grantedAt: "2026-11-01T09:00:00.000Z",
        scopes: [],
      },
    ],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  connectedTo(CLIENT_ID, "Claude");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("listProposalFeed", () => {
  it("refuses a signed-out reader before loading anything", async () => {
    install(fakeClient({ user: null }));

    const result = await listProposalFeed();

    expect(result).toEqual({ ok: false, error: SIGNED_OUT });
    expect(mockedListConnectedApps).not.toHaveBeenCalled();
  });

  it("says the feed could not be loaded rather than showing an empty desk", async () => {
    install(
      fakeClient({
        tables: {
          ai_proposals: { data: null, error: { message: "connection reset" } },
        },
      })
    );

    const result = await listProposalFeed();

    expect(result).toEqual({ ok: false, error: READ_FAILED });
  });

  it("splits what is waiting from what was decided, newest first as the database sent it", async () => {
    install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: [
              proposalRow({ id: "waiting" }),
              proposalRow({
                id: "decided",
                status: "applied",
                decided_at: "2026-11-01T11:00:00.000Z",
                result: { sentCount: 2, skippedCount: 0 },
              }),
            ],
            error: null,
          },
        },
      })
    );

    const result = await listProposalFeed();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.pending.map((p) => p.id)).toEqual(["waiting"]);
    expect(result.data.decided.map((p) => p.id)).toEqual(["decided"]);
    expect(result.data.pending[0]).toMatchObject({
      guestCount: 2,
      eventTitle: "The Nuptials",
      appLabel: "A connected app",
      note: null,
      status: "pending",
    });
    expect(result.data.decided[0].result).toEqual({
      sentCount: 2,
      skippedCount: 0,
      totalCount: 2,
      reason: null,
      appliedCount: 0,
      seatedCount: 0,
      movedCount: 0,
      tableCount: 0,
      restoredAt: null,
      restoredCount: 0,
      restoreUnavailable: null,
    });
  });

  it("shows a pending row past its deadline as expired, and not as something to approve", async () => {
    install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: [
              proposalRow({
                id: "overdue",
                expires_at: "2020-01-01T00:00:00.000Z",
              }),
            ],
            error: null,
          },
        },
      })
    );

    const result = await listProposalFeed();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.pending).toEqual([]);
    expect(result.data.decided[0]).toMatchObject({
      id: "overdue",
      status: "expired",
    });
  });

  it("shows an approved proposal that sat too long as interrupted, never as pending", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-01T12:00:00.000Z"));

    install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: [
              proposalRow({
                id: "stalled",
                status: "approved",
                decided_at: "2026-11-01T11:49:59.999Z",
              }),
            ],
            error: null,
          },
        },
      })
    );

    const result = await listProposalFeed();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // One millisecond past ten minutes. The send may have stopped partway, so it is not pending.
    expect(result.data.pending).toEqual([]);
    expect(result.data.decided[0]).toMatchObject({
      id: "stalled",
      status: "interrupted",
    });
  });

  it("leaves an approved proposal alone at exactly ten minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-01T12:00:00.000Z"));

    install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: [
              proposalRow({
                id: "just-approved",
                status: "approved",
                decided_at: "2026-11-01T11:50:00.000Z",
              }),
            ],
            error: null,
          },
        },
      })
    );

    const result = await listProposalFeed();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.pending).toEqual([]);
    expect(result.data.decided[0]).toMatchObject({
      id: "just-approved",
      status: "approved",
    });
  });

  it("never claims an app is connected when the grant list says otherwise", async () => {
    install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: [proposalRow({ id: "stale", client_id: "someone-else" })],
            error: null,
          },
        },
      })
    );

    const result = await listProposalFeed();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.pending[0]).toMatchObject({
      appLabel: "An app that is no longer connected",
      appSelfName: null,
    });
  });

  it("says only what the proposal row proves when the grant list cannot be read", async () => {
    mockedListConnectedApps.mockResolvedValue({
      ok: false,
      error: "Could not load your connected apps right now.",
    });

    install(
      fakeClient({
        tables: {
          ai_proposals: { data: [proposalRow()], error: null },
        },
      })
    );

    const result = await listProposalFeed();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.pending[0]).toMatchObject({
      appLabel: "An app acting as you",
      appSelfName: null,
    });
  });

  it("quotes the app's own name, cleaned and cut short, beside the neutral label", async () => {
    const longName = `  ${"Very Long App Name ".repeat(4)}  `;
    connectedTo(CLIENT_ID, longName);

    install(
      fakeClient({
        tables: { ai_proposals: { data: [proposalRow()], error: null } },
      })
    );

    const result = await listProposalFeed();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [proposal] = result.data.pending;
    expect(proposal.appLabel).toBe("A connected app");
    expect(proposal.appSelfName).toHaveLength(40);
    expect(proposal.appSelfName?.endsWith("…")).toBe(true);
    expect(proposal.appSelfName).not.toContain("  ");
  });

  it("keeps the payload's own words, and nothing else, on the card", async () => {
    install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: [
              proposalRow({
                payload: {
                  guestIds: [GUEST_A],
                  note: "The list from my mother arrived late.",
                },
              }),
            ],
            error: null,
          },
        },
      })
    );

    const result = await listProposalFeed();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.pending[0].note).toBe(
      "The list from my mother arrived late."
    );
    expect(result.data.pending[0].guestCount).toBe(1);
  });

  it("drops a payload it cannot parse rather than guessing at it", async () => {
    install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: [
              proposalRow({ payload: { guestIds: ["not-a-uuid"] }, note: "x" }),
            ],
            error: null,
          },
        },
      })
    );

    const result = await listProposalFeed();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.pending[0]).toMatchObject({ guestCount: 0, note: null });
  });

  it("falls back to a neutral celebration name when the join is empty", async () => {
    install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: [proposalRow({ events: null })],
            error: null,
          },
        },
      })
    );

    const result = await listProposalFeed();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.pending[0].eventTitle).toBe("A celebration");
  });

  it("reads the join whether Supabase hands back an object or an array", async () => {
    install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: [proposalRow({ events: [{ title: "From An Array" }] })],
            error: null,
          },
        },
      })
    );

    const result = await listProposalFeed();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.pending[0].eventTitle).toBe("From An Array");
  });

  it("remembers fifty decided proposals and no more", async () => {
    const decided = Array.from({ length: 60 }, (_, index) =>
      proposalRow({
        id: `decided-${index}`,
        status: "rejected",
        decided_at: "2026-11-01T11:00:00.000Z",
      })
    );

    install(
      fakeClient({
        tables: { ai_proposals: { data: decided, error: null } },
      })
    );

    const result = await listProposalFeed();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.decided).toHaveLength(50);
    expect(result.data.pending).toEqual([]);
  });

  it("reads the host's own rows newest first", async () => {
    const fake = install(
      fakeClient({
        tables: { ai_proposals: { data: [], error: null } },
      })
    );

    await listProposalFeed();

    const calls = fake.callsFor("ai_proposals");
    expect(calls.find((call) => call.method === "order")?.args).toEqual([
      "created_at",
      { ascending: false },
    ]);
  });
});

describe("proposal results", () => {
  it("bounds the recorded numbers so nothing odd reaches the card", async () => {
    install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: [
              proposalRow({
                status: "failed",
                decided_at: "2026-11-01T11:00:00.000Z",
                result: {
                  sentCount: 3.7,
                  skippedCount: -2,
                  reason: "  1 invitation could not be sent.  ",
                },
              }),
            ],
            error: null,
          },
        },
      })
    );

    const result = await listProposalFeed();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.decided[0].result).toEqual({
      sentCount: 3,
      skippedCount: 0,
      totalCount: 2,
      reason: "1 invitation could not be sent.",
      appliedCount: 0,
      seatedCount: 0,
      movedCount: 0,
      tableCount: 0,
      restoredAt: null,
      restoredCount: 0,
      restoreUnavailable: null,
    });
  });

  it("has no result at all until the proposal has been applied", async () => {
    install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: [
              proposalRow({
                status: "approved",
                decided_at: "2026-11-01T11:00:00.000Z",
                result: { sentCount: 2, skippedCount: 0 },
              }),
            ],
            error: null,
          },
        },
      })
    );

    const result = await listProposalFeed();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.decided[0].result).toBeNull();
  });

  it("ignores a result that is not an object", async () => {
    install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: [
              proposalRow({
                status: "applied",
                decided_at: "2026-11-01T11:00:00.000Z",
                result: "sent",
              }),
            ],
            error: null,
          },
        },
      })
    );

    const result = await listProposalFeed();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.decided[0].result).toBeNull();
  });
});

describe("countPendingProposals", () => {
  it("counts nothing for a signed-out reader", async () => {
    install(fakeClient({ user: null }));

    expect(await countPendingProposals()).toBe(0);
  });

  it("counts nothing when the count cannot be read", async () => {
    install(
      fakeClient({
        tables: {
          ai_proposals: { data: null, error: { message: "boom" }, count: null },
        },
      })
    );

    expect(await countPendingProposals()).toBe(0);
  });

  it("counts only pending proposals that have not expired", async () => {
    const fake = install(
      fakeClient({
        tables: { ai_proposals: { data: null, error: null, count: 4 } },
      })
    );

    expect(await countPendingProposals()).toBe(4);

    const calls = fake.callsFor("ai_proposals");
    expect(calls.find((call) => call.method === "eq")?.args).toEqual([
      "status",
      "pending",
    ]);
    expect(calls.find((call) => call.method === "gt")?.args[0]).toBe(
      "expires_at"
    );
  });

  it("treats a missing count as none waiting", async () => {
    install(
      fakeClient({
        tables: { ai_proposals: { data: null, error: null, count: null } },
      })
    );

    expect(await countPendingProposals()).toBe(0);
  });
});

describe("listRecentActivity", () => {
  it("refuses a signed-out reader", async () => {
    install(fakeClient({ user: null }));

    expect(await listRecentActivity()).toEqual({
      ok: false,
      error: SIGNED_OUT,
    });
  });

  it("says the activity could not be loaded rather than showing an empty history", async () => {
    install(
      fakeClient({
        tables: { ai_activity_log: { data: null, error: { message: "x" } } },
      })
    );

    expect(await listRecentActivity()).toEqual({
      ok: false,
      error: ACTIVITY_FAILED,
    });
  });

  it("maps what each call did, and nothing about what it was given", async () => {
    install(
      fakeClient({
        tables: {
          ai_activity_log: {
            data: [
              {
                id: "log-1",
                tool: "list_guests",
                event_id: EVENT_ID,
                outcome: "ok",
                note: null,
                created_at: "2026-11-01T12:00:00.000Z",
                events: { title: "The Nuptials" },
              },
              {
                id: "log-2",
                tool: "update_guest",
                event_id: null,
                outcome: "denied",
                note: "Read-only connection.",
                created_at: "2026-11-01T11:00:00.000Z",
                events: [{ title: "Another Celebration" }],
              },
            ],
            error: null,
          },
        },
      })
    );

    const result = await listRecentActivity();

    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: "log-1",
          tool: "list_guests",
          eventTitle: "The Nuptials",
          outcome: "ok",
          note: null,
          createdAt: "2026-11-01T12:00:00.000Z",
        },
        {
          id: "log-2",
          tool: "update_guest",
          eventTitle: "Another Celebration",
          outcome: "denied",
          note: "Read-only connection.",
          createdAt: "2026-11-01T11:00:00.000Z",
        },
      ],
    });
  });

  it("reads at most a page of activity, newest first", async () => {
    const fake = install(
      fakeClient({
        tables: { ai_activity_log: { data: [], error: null } },
      })
    );

    await listRecentActivity();

    const calls = fake.callsFor("ai_activity_log");
    expect(calls.find((call) => call.method === "order")?.args).toEqual([
      "created_at",
      { ascending: false },
    ]);
    expect(calls.find((call) => call.method === "limit")?.args).toEqual([50]);
  });
});
