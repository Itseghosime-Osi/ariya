import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/invitations/actions", () => ({
  sendGuestInvitationEmailAction: vi.fn(),
}));
vi.mock("@/features/reminders/actions", () => ({
  sendBatchReminderAction: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendGuestInvitationEmailAction } from "@/features/invitations/actions";
import { sendBatchReminderAction } from "@/features/reminders/actions";
import { approveProposalAction, rejectProposalAction } from "./actions";

const mockedCreateClient = vi.mocked(createClient);
const mockedSendInvitation = vi.mocked(sendGuestInvitationEmailAction);
const mockedSendBatch = vi.mocked(sendBatchReminderAction);

const PROPOSAL_ID = "11111111-1111-4111-8111-111111111111";
const EVENT_ID = "22222222-2222-4222-8222-222222222222";
const GUEST_A = "33333333-3333-4333-8333-333333333333";
const GUEST_B = "44444444-4444-4444-8444-444444444444";

const UNIDENTIFIED = "That proposal could not be identified.";
const SIGNED_OUT = "Sign in to approve a proposal.";
const NOT_AVAILABLE =
  "That kind of proposal cannot be applied yet. Nothing was sent, and nothing was changed.";
const ALREADY_DECIDED =
  "That proposal has already been decided, or it has expired. Nothing more was sent.";
const NOT_APPROVED = "That proposal is not waiting to be applied.";

type Result = { data?: unknown; error?: unknown; count?: number };
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
 * Stands in for the Supabase client. Answers per table, records every RPC with its arguments, and
 * keeps the chain each `from()` call walked, so a test can assert both what came back and what was
 * asked for — including which filters narrowed the guests.
 */
function fakeClient(
  options: {
    user?: { id: string } | null;
    tables?: Record<string, Result>;
    rpc?: Record<string, Result>;
  } = {}
) {
  const rpc: { name: string; args: Record<string, unknown> }[] = [];
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
    rpc: async (name: string, args?: Record<string, unknown>) => {
      rpc.push({ name, args: args ?? {} });
      return options.rpc?.[name] ?? { data: null, error: null };
    },
  };

  return {
    client,
    rpc,
    chains,
    callsFor: (table: string) =>
      chains.filter((chain) => chain.table === table).flatMap((c) => c.calls),
    rpcCalls: (name: string) => rpc.filter((call) => call.name === name),
  };
}

function install(fake: ReturnType<typeof fakeClient>) {
  mockedCreateClient.mockResolvedValue(
    fake.client as unknown as Awaited<ReturnType<typeof createClient>>
  );
  return fake;
}

/** A proposal that has just been approved, with a payload the apply can act on. */
function approvedProposal(
  kind: string,
  payload: unknown = { guestIds: [GUEST_A, GUEST_B] }
) {
  return {
    tables: {
      ai_proposals: {
        data: { kind, event_id: EVENT_ID, payload },
        error: null,
      },
    },
    rpc: { decide_ai_proposal: { data: { status: "approved" }, error: null } },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedSendInvitation.mockResolvedValue({
    success: true,
    message: "Invitation sent.",
  } as never);
});

describe("approveProposalAction", () => {
  it("refuses an id that is not a proposal reference before touching the database", async () => {
    const fake = install(fakeClient());

    const result = await approveProposalAction("not-a-uuid");

    expect(result).toEqual({ ok: false, error: UNIDENTIFIED });
    expect(fake.rpc).toEqual([]);
  });

  it("refuses a signed-out caller", async () => {
    const fake = install(fakeClient({ user: null }));

    const result = await approveProposalAction(PROPOSAL_ID);

    expect(result).toEqual({ ok: false, error: SIGNED_OUT });
    expect(fake.rpc).toEqual([]);
  });

  it("reports a proposal that was already decided without sending anything", async () => {
    install(
      fakeClient({
        rpc: {
          decide_ai_proposal: {
            error: {
              message: "no longer waiting",
              hint: "PROPOSAL_NOT_PENDING",
            },
          },
        },
      })
    );

    const result = await approveProposalAction(PROPOSAL_ID);

    expect(result).toEqual({ ok: false, error: ALREADY_DECIDED });
    expect(mockedSendInvitation).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/approvals");
  });

  it("says a proposal expired rather than pretending it was applied", async () => {
    const fake = install(
      fakeClient({
        rpc: {
          decide_ai_proposal: { data: { status: "expired", decided: false } },
        },
      })
    );

    const result = await approveProposalAction(PROPOSAL_ID);

    expect(result).toEqual({
      ok: false,
      error:
        "That proposal expired before you decided it. Nothing was sent, and a fresh request will be needed.",
    });
    expect(mockedSendInvitation).not.toHaveBeenCalled();
    expect(fake.rpcCalls("record_ai_proposal_result")).toEqual([]);
  });

  it("refuses a kind the app cannot carry out yet, and sends nothing", async () => {
    install(
      fakeClient(approvedProposal("apply_hall_layout", { guestIds: [GUEST_A] }))
    );

    const result = await approveProposalAction(PROPOSAL_ID);

    expect(result).toEqual({ ok: false, error: NOT_AVAILABLE });
    expect(mockedSendInvitation).not.toHaveBeenCalled();
    expect(mockedSendBatch).not.toHaveBeenCalled();
  });

  it("records a payload it cannot act on as failed rather than sending part of it", async () => {
    const fake = install(
      fakeClient(approvedProposal("send_invitations", { guestIds: [] }))
    );

    const result = await approveProposalAction(PROPOSAL_ID);

    expect(result).toEqual({
      ok: true,
      data: {
        proposalId: PROPOSAL_ID,
        status: "failed",
        sentCount: 0,
        skippedCount: 0,
        message:
          "This proposal's details were not in a form Àríyá can act on, so nothing was sent.",
      },
    });
    expect(mockedSendInvitation).not.toHaveBeenCalled();

    const [recorded] = fake.rpcCalls("record_ai_proposal_result");
    expect(recorded.args).toMatchObject({
      p_id: PROPOSAL_ID,
      p_status: "failed",
      p_result: {
        sentCount: 0,
        skippedCount: 0,
        reason: "The proposal's details were not in a form Àríyá can act on.",
      },
    });
  });

  it("sends invitations to the guests who still qualify, and records it as applied", async () => {
    const fake = install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: {
              kind: "send_invitations",
              event_id: EVENT_ID,
              payload: { guestIds: [GUEST_A, GUEST_B] },
            },
            error: null,
          },
          guests: { data: [{ id: GUEST_A }, { id: GUEST_B }], error: null },
        },
        rpc: { decide_ai_proposal: { data: { status: "approved" } } },
      })
    );

    const result = await approveProposalAction(PROPOSAL_ID);

    expect(result).toEqual({
      ok: true,
      data: {
        proposalId: PROPOSAL_ID,
        status: "applied",
        sentCount: 2,
        skippedCount: 0,
        message: "Sent to all 2 guests.",
      },
    });

    expect(mockedSendInvitation).toHaveBeenCalledTimes(2);
    expect(mockedSendInvitation).toHaveBeenNthCalledWith(1, EVENT_ID, GUEST_A);
    expect(mockedSendInvitation).toHaveBeenNthCalledWith(2, EVENT_ID, GUEST_B);

    // The filter is what makes a retry safe: anyone already invited drops out instead of being
    // emailed a second time.
    const guestCalls = fake.callsFor("guests");
    expect(
      guestCalls.some(
        (call) =>
          call.method === "eq" &&
          call.args[0] === "event_id" &&
          call.args[1] === EVENT_ID
      )
    ).toBe(true);
    expect(
      guestCalls.some((call) => call.method === "in" && call.args[0] === "id")
    ).toBe(true);
    expect(guestCalls.find((call) => call.method === "not")?.args).toEqual([
      "email",
      "is",
      null,
    ]);
    expect(guestCalls.find((call) => call.method === "is")?.args).toEqual([
      "invited_at",
      null,
    ]);

    expect(fake.rpcCalls("record_ai_proposal_result")[0].args).toMatchObject({
      p_status: "applied",
      p_result: { sentCount: 2, skippedCount: 0 },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/approvals");
    expect(revalidatePath).toHaveBeenCalledWith("/connect-ai");
  });

  it("applies with nothing sent when everyone had already been invited", async () => {
    const fake = install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: {
              kind: "send_invitations",
              event_id: EVENT_ID,
              payload: { guestIds: [GUEST_A, GUEST_B] },
            },
            error: null,
          },
          guests: { data: [], error: null },
        },
        rpc: { decide_ai_proposal: { data: { status: "approved" } } },
      })
    );

    const result = await approveProposalAction(PROPOSAL_ID);

    expect(mockedSendInvitation).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      data: { status: "applied", sentCount: 0, skippedCount: 2 },
    });
    expect(fake.rpcCalls("record_ai_proposal_result")[0].args).toMatchObject({
      p_status: "applied",
      p_result: {
        sentCount: 0,
        skippedCount: 2,
        reason:
          "Everyone had already been invited, or no longer has an email address.",
      },
    });
  });

  it("records a partial send as failed, and says how many did not go", async () => {
    mockedSendInvitation
      .mockResolvedValueOnce({ success: true } as never)
      .mockResolvedValueOnce({ success: false, message: "no email" } as never);

    const fake = install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: {
              kind: "send_invitations",
              event_id: EVENT_ID,
              payload: { guestIds: [GUEST_A, GUEST_B] },
            },
            error: null,
          },
          guests: { data: [{ id: GUEST_A }, { id: GUEST_B }], error: null },
        },
        rpc: { decide_ai_proposal: { data: { status: "approved" } } },
      })
    );

    const result = await approveProposalAction(PROPOSAL_ID);

    expect(result).toMatchObject({
      ok: true,
      data: { status: "failed", sentCount: 1, skippedCount: 1 },
    });
    expect(fake.rpcCalls("record_ai_proposal_result")[0].args).toMatchObject({
      p_status: "failed",
      p_result: { reason: "1 invitation could not be sent." },
    });
  });

  it("records a send that threw as failed, and says what it managed before it stopped", async () => {
    mockedSendInvitation.mockRejectedValueOnce(new Error("smtp said no"));

    const fake = install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: {
              kind: "send_invitations",
              event_id: EVENT_ID,
              payload: { guestIds: [GUEST_A] },
            },
            error: null,
          },
          guests: { data: [{ id: GUEST_A }], error: null },
        },
        rpc: { decide_ai_proposal: { data: { status: "approved" } } },
      })
    );

    const result = await approveProposalAction(PROPOSAL_ID);

    expect(result).toMatchObject({
      ok: true,
      data: { status: "failed", sentCount: 0 },
    });
    expect(fake.rpcCalls("record_ai_proposal_result")[0].args).toMatchObject({
      p_status: "failed",
      p_result: {
        sentCount: 0,
        skippedCount: 0,
        reason:
          "Sending stopped unexpectedly. Some guests may already have been contacted.",
      },
    });
  });

  it("hands reminders to the batch action with the proposal's own words", async () => {
    mockedSendBatch.mockResolvedValue({
      success: true,
      sentCount: 2,
      skippedCount: 0,
    } as never);

    install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: {
              kind: "send_reminders",
              event_id: EVENT_ID,
              payload: {
                guestIds: [GUEST_A, GUEST_B],
                note: "Two weeks to go.",
              },
            },
            error: null,
          },
          events: { data: { title: "The Nuptials" }, error: null },
        },
        rpc: { decide_ai_proposal: { data: { status: "approved" } } },
      })
    );

    const result = await approveProposalAction(PROPOSAL_ID);

    expect(result).toEqual({
      ok: true,
      data: {
        proposalId: PROPOSAL_ID,
        status: "applied",
        sentCount: 2,
        skippedCount: 0,
        message: "2 reminders sent.",
      },
    });

    expect(mockedSendBatch).toHaveBeenCalledTimes(1);
    const [eventId, form] = mockedSendBatch.mock.calls[0];
    expect(eventId).toBe(EVENT_ID);
    expect(form.get("filter")).toBe("all");
    expect(form.get("subject")).toBe("A gentle reminder about The Nuptials");
    expect(form.get("customMessage")).toBe("Two weeks to go.");
    expect(form.getAll("guestIds")).toEqual([GUEST_A, GUEST_B]);
  });

  it("keeps the reminder subject inside what an email client will show", async () => {
    mockedSendBatch.mockResolvedValue({ sentCount: 1 } as never);

    install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: {
              kind: "send_reminders",
              event_id: EVENT_ID,
              payload: { guestIds: [GUEST_A] },
            },
            error: null,
          },
          events: { data: { title: "A".repeat(200) }, error: null },
        },
        rpc: { decide_ai_proposal: { data: { status: "approved" } } },
      })
    );

    await approveProposalAction(PROPOSAL_ID);

    const subject = (mockedSendBatch.mock.calls[0][1] as FormData).get(
      "subject"
    ) as string;
    expect(subject).toHaveLength(150);
    expect(subject.endsWith("…")).toBe(true);
  });

  it("records a batch that sent nothing as failed, naming the 24-hour cap", async () => {
    mockedSendBatch.mockResolvedValue({
      sentCount: 0,
      skippedCount: 3,
    } as never);

    const fake = install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: {
              kind: "send_reminders",
              event_id: EVENT_ID,
              payload: { guestIds: [GUEST_A, GUEST_B] },
            },
            error: null,
          },
          events: { data: { title: "The Nuptials" }, error: null },
        },
        rpc: { decide_ai_proposal: { data: { status: "approved" } } },
      })
    );

    const result = await approveProposalAction(PROPOSAL_ID);

    expect(result).toMatchObject({ ok: true, data: { status: "failed" } });
    expect(fake.rpcCalls("record_ai_proposal_result")[0].args).toMatchObject({
      p_status: "failed",
      p_result: {
        sentCount: 0,
        reason:
          "No reminders could be sent. Guests may have been emailed too recently.",
      },
    });
  });

  it("passes on the batch action's own refusal rather than inventing one", async () => {
    mockedSendBatch.mockResolvedValue({
      error: "You have reached your monthly email limit.",
    } as never);

    const fake = install(
      fakeClient({
        tables: {
          ai_proposals: {
            data: {
              kind: "send_reminders",
              event_id: EVENT_ID,
              payload: { guestIds: [GUEST_A] },
            },
            error: null,
          },
          events: { data: { title: "The Nuptials" }, error: null },
        },
        rpc: { decide_ai_proposal: { data: { status: "approved" } } },
      })
    );

    const result = await approveProposalAction(PROPOSAL_ID);

    expect(result).toMatchObject({
      ok: true,
      data: {
        status: "failed",
        message: "You have reached your monthly email limit.",
      },
    });
    expect(fake.rpcCalls("record_ai_proposal_result")[0].args).toMatchObject({
      p_result: { reason: "You have reached your monthly email limit." },
    });
  });

  it("says so when the approved proposal cannot be read back", async () => {
    install(
      fakeClient({
        tables: { ai_proposals: { data: null, error: { message: "gone" } } },
        rpc: { decide_ai_proposal: { data: { status: "approved" } } },
      })
    );

    const result = await approveProposalAction(PROPOSAL_ID);

    expect(result).toEqual({
      ok: false,
      error: "That proposal could not be read back.",
    });
    expect(mockedSendInvitation).not.toHaveBeenCalled();
  });
});

describe("rejectProposalAction", () => {
  it("refuses an id that is not a proposal reference", async () => {
    const fake = install(fakeClient());

    const result = await rejectProposalAction("not-a-uuid");

    expect(result).toEqual({ ok: false, error: UNIDENTIFIED });
    expect(fake.rpc).toEqual([]);
  });

  it("refuses a signed-out caller", async () => {
    const fake = install(fakeClient({ user: null }));

    const result = await rejectProposalAction(PROPOSAL_ID);

    expect(result).toEqual({ ok: false, error: SIGNED_OUT });
    expect(fake.rpc).toEqual([]);
  });

  it("rejects with the host's own session, and never sends", async () => {
    const fake = install(fakeClient());

    const result = await rejectProposalAction(PROPOSAL_ID);

    expect(result).toEqual({ ok: true, data: { proposalId: PROPOSAL_ID } });
    expect(fake.rpcCalls("decide_ai_proposal")[0].args).toEqual({
      p_id: PROPOSAL_ID,
      p_decision: "reject",
    });
    expect(mockedSendInvitation).not.toHaveBeenCalled();
    expect(mockedSendBatch).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/approvals");
  });

  it("spells out the two refusals a host can actually hit", async () => {
    install(
      fakeClient({
        rpc: {
          decide_ai_proposal: {
            error: { message: "x", hint: "PROPOSAL_NOT_PENDING" },
          },
        },
      })
    );

    expect(await rejectProposalAction(PROPOSAL_ID)).toEqual({
      ok: false,
      error: ALREADY_DECIDED,
    });

    install(
      fakeClient({
        rpc: {
          decide_ai_proposal: {
            error: { message: "x", hint: "PROPOSAL_NOT_APPROVED" },
          },
        },
      })
    );

    expect(await rejectProposalAction(PROPOSAL_ID)).toEqual({
      ok: false,
      error: NOT_APPROVED,
    });
  });

  it("falls back to a plain message for anything else the database says", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    install(
      fakeClient({
        rpc: {
          decide_ai_proposal: {
            error: { message: "connection reset", code: "08006" },
          },
        },
      })
    );

    const result = await rejectProposalAction(PROPOSAL_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toContain("08006");
  });
});
