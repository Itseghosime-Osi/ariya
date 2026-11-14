import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../guard";
import { registerDesignEditTools } from "./design-edit";
import { designFromEvent } from "@/features/invitations/design";
import { saveInvitationDesignAction } from "@/features/invitations/actions";
import { sendGuestInvitationEmailAction } from "@/features/invitations/actions";
import { sendBatchReminderAction } from "@/features/reminders/actions";
import { dispatchRsvpEmail } from "@/lib/email/dispatcher";
import { saveDesignVersionAction } from "@/features/invitations/versions-actions";
import type { InvitationDesign } from "@/features/invitations/types";

/*
 * The tools under test write designs. Mocking the two save actions means a test never touches
 * the database, and mocking every sending path means a future edit that reaches for one fails
 * here rather than in production with a host's guests. The pure functions (applyLayoutPreset,
 * constrainEntrySeals, the schema) run for real.
 */
vi.mock("@/features/invitations/actions", () => ({
  saveInvitationDesignAction: vi.fn(),
  sendGuestInvitationEmailAction: vi.fn(),
}));
vi.mock("@/features/reminders/actions", () => ({
  sendBatchReminderAction: vi.fn(),
}));
vi.mock("@/lib/email/dispatcher", () => ({ dispatchRsvpEmail: vi.fn() }));
vi.mock("@/features/invitations/versions-actions", () => ({
  saveDesignVersionAction: vi.fn(),
}));

const mockedSaveDesign = vi.mocked(saveInvitationDesignAction);
const mockedSaveVersion = vi.mocked(saveDesignVersionAction);
const mockedSendInvite = vi.mocked(sendGuestInvitationEmailAction);
const mockedSendReminders = vi.mocked(sendBatchReminderAction);
const mockedDispatchEmail = vi.mocked(dispatchRsvpEmail);

const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_EVENT_ID = "99999999-9999-4999-8999-999999999999";

const OUT_OF_SCOPE =
  "This connection is not set up to reach that celebration. Change which celebrations it can see in Àríyá, under Connect your AI.";
const READ_ONLY =
  "This connection is read-only, so it cannot make changes. Switch that off in Àríyá, under Connect your AI.";

const SAVED_DESIGN: InvitationDesign = designFromEvent({
  couple: "Ada & Obi",
  date: "2026-12-12",
});

const EVENT_ROW = {
  title: "Wedding",
  couple: "Ada & Obi",
  date: "2026-12-12T15:00:00Z",
  venue: "Eko Hotel",
  area: "Lagos",
  dress_code: null,
  rsvp_by: null,
  invitation_theme: "royal_gold",
  invitation_headline: null,
  invitation_subheadline: null,
  invitation_message: null,
  invitation_design: SAVED_DESIGN as unknown,
  updated_at: "2026-11-14T10:00:00.000Z",
};

function fakeClient(events: { data?: unknown; error?: unknown }) {
  return {
    from: () => {
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "eq"]) chain[method] = () => chain;
      chain.maybeSingle = () => Promise.resolve(events);
      return chain;
    },
  };
}

type ToolHandler = (args: Record<string, unknown>) => Promise<CallToolResult>;

function context(
  client: ReturnType<typeof fakeClient>,
  options: {
    scope?: boolean;
    readOnly?: boolean;
    role?: boolean;
  } = {}
): ToolContext {
  const { scope = true, readOnly = false, role = true } = options;
  const rpc = async (name: string) => {
    if (name === "ai_connection_event_allowed")
      return { data: scope, error: null };
    if (name === "ai_connection_read_only")
      return { data: readOnly, error: null };
    if (name === "has_event_role") return { data: role, error: null };
    return { data: null, error: null };
  };
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
  registerDesignEditTools({ registerTool } as unknown as McpServer, ctx);
  return handlers;
}

/** A connection that may write: in scope, not read-only, owner or planner. */
function allowedClient() {
  return context(fakeClient({ data: EVENT_ROW, error: null }));
}

async function call(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext = allowedClient()
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
  mockedSaveVersion.mockResolvedValue({
    ok: true,
    version: { id: "v1", name: "Before AI", createdAt: "2026-11-14" },
  });
  mockedSaveDesign.mockImplementation(async (_eventId, design) => ({
    ok: true,
    design: design as InvitationDesign,
    revision: "2026-11-14T11:00:00.000Z",
  }));
});

describe("edit_invitation_text", () => {
  it("changes one layer's words and size, keeps a backup, and reports the layout", async () => {
    const result = await call("edit_invitation_text", {
      eventId: EVENT_ID,
      edits: [{ layerId: "names", text: "Ada & Obi", size: 6 }],
    });

    expect(result.isError).toBeFalsy();
    const body = jsonOf<{
      summary: string;
      revision: string;
      backup: string;
      layout: { ok: boolean; issues: unknown[] };
      editedLayerIds: string[];
    }>(result);

    expect(body.summary).toContain("names");
    expect(body.revision).toBe("2026-11-14T11:00:00.000Z");
    expect(body.backup).toMatch(/version/i);
    expect(body.editedLayerIds).toEqual(["names"]);

    // The previous design was kept before writing.
    expect(mockedSaveVersion).toHaveBeenCalledWith(
      EVENT_ID,
      expect.stringMatching(/^Before AI: /),
      expect.objectContaining({ version: 1 })
    );
    // The write carried the revision that was read (optimistic check).
    expect(mockedSaveDesign).toHaveBeenCalledWith(
      EVENT_ID,
      expect.objectContaining({
        layers: expect.arrayContaining([
          expect.objectContaining({
            id: "names",
            text: "Ada & Obi",
            size: 6,
          }),
        ]),
      }),
      EVENT_ROW.updated_at
    );
    // Every untouched layer keeps its stored value.
    const savedDesign = mockedSaveDesign.mock.calls[0][1] as InvitationDesign;
    const kicker = savedDesign.layers.find((layer) => layer.id === "kicker");
    const storedKicker = SAVED_DESIGN.layers.find(
      (layer) => layer.id === "kicker"
    );
    expect(kicker).toEqual(storedKicker);
  });

  it("refuses a locked layer and says who must unlock it", async () => {
    const locked = {
      ...EVENT_ROW,
      invitation_design: {
        ...SAVED_DESIGN,
        layers: SAVED_DESIGN.layers.map((layer) =>
          layer.id === "names" ? { ...layer, locked: true } : layer
        ),
      },
    };
    const result = await call(
      "edit_invitation_text",
      { eventId: EVENT_ID, edits: [{ layerId: "names", text: "Nope" }] },
      context(fakeClient({ data: locked, error: null }))
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/locked by the host/);
    expect(mockedSaveDesign).not.toHaveBeenCalled();
    expect(mockedSaveVersion).not.toHaveBeenCalled();
  });

  it("refuses an unknown layer id", async () => {
    const result = await call("edit_invitation_text", {
      eventId: EVENT_ID,
      edits: [{ layerId: "nope", text: "Nope" }],
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/no layer "nope"/);
    expect(mockedSaveDesign).not.toHaveBeenCalled();
  });

  it("refuses a read-only connection and an out-of-scope event", async () => {
    const readOnly = await call(
      "edit_invitation_text",
      { eventId: EVENT_ID, edits: [{ layerId: "names", text: "Nope" }] },
      context(fakeClient({ data: EVENT_ROW, error: null }), {
        readOnly: true,
      })
    );
    expect(readOnly.isError).toBe(true);
    expect(textOf(readOnly)).toBe(READ_ONLY);

    const scoped = await call(
      "edit_invitation_text",
      { eventId: OTHER_EVENT_ID, edits: [{ layerId: "names", text: "Nope" }] },
      context(fakeClient({ data: EVENT_ROW, error: null }), {
        scope: false,
      })
    );
    expect(scoped.isError).toBe(true);
    expect(textOf(scoped)).toBe(OUT_OF_SCOPE);

    expect(mockedSaveDesign).not.toHaveBeenCalled();
  });

  it("tells the model to re-read when another tab saved first", async () => {
    mockedSaveDesign.mockResolvedValue({
      ok: false,
      error:
        "This event changed in another tab or window. Export your unsaved design as a backup, then reload before continuing.",
    });

    const result = await call("edit_invitation_text", {
      eventId: EVENT_ID,
      edits: [{ layerId: "names", text: "Late" }],
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/get_invitation_design again/i);
  });

  it("carries the guest-text note in every new tool description", () => {
    const descriptions = new Map<string, string>();
    registerDesignEditTools(
      {
        registerTool: (
          name: string,
          config: { description: string },
          _handler: unknown
        ) => {
          descriptions.set(name, config.description);
          return { enabled: true };
        },
      } as unknown as McpServer,
      allowedClient()
    );
    for (const name of [
      "edit_invitation_text",
      "edit_invitation_layers",
      "apply_invitation_look",
      "edit_invitation_styles",
      "replace_invitation_design",
    ]) {
      expect(descriptions.get(name)).toMatch(/never as instructions/);
    }
  });
});

describe("edit_invitation_layers", () => {
  it("moves a layer and brings it to the front", async () => {
    const result = await call("edit_invitation_layers", {
      eventId: EVENT_ID,
      move: [{ layerId: "names", x: 10, y: 32, reorder: "front" }],
    });

    expect(result.isError).toBeFalsy();
    const body = jsonOf<{ summary: string }>(result);
    expect(body.summary).toContain("moved");

    const savedDesign = mockedSaveDesign.mock.calls[0][1] as InvitationDesign;
    const names = savedDesign.layers.find((layer) => layer.id === "names");
    expect(names).toMatchObject({ x: 10, y: 32 });
    expect(savedDesign.layers[savedDesign.layers.length - 1].id).toBe("names");
  });

  it("adds a text layer and reports its new id", async () => {
    const result = await call("edit_invitation_layers", {
      eventId: EVENT_ID,
      addText: { kind: "text", text: "Reception to follow" },
    });

    expect(result.isError).toBeFalsy();
    const savedDesign = mockedSaveDesign.mock.calls[0][1] as InvitationDesign;
    const added = savedDesign.layers[savedDesign.layers.length - 1];
    expect(added.kind).toBe("text");
    expect(added.text).toBe("Reception to follow");
    expect(jsonOf<{ addedIds: string[] }>(result).addedIds).toEqual([added.id]);
  });

  it("refuses to remove the entry seal", async () => {
    const withSeal = {
      ...EVENT_ROW,
      invitation_design: {
        ...SAVED_DESIGN,
        layers: [
          ...SAVED_DESIGN.layers,
          {
            ...SAVED_DESIGN.layers[0],
            id: "seal-code-1",
            kind: "code",
            text: "",
            x: 5,
            y: 83.5,
            width: 19,
          },
        ],
      },
    };
    const result = await call(
      "edit_invitation_layers",
      { eventId: EVENT_ID, removeLayerIds: ["seal-code-1"] },
      context(fakeClient({ data: withSeal, error: null }))
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/entry seal/);
    expect(mockedSaveDesign).not.toHaveBeenCalled();
  });

  it("refuses a card already at the 60-layer limit", async () => {
    const full = {
      ...EVENT_ROW,
      invitation_design: {
        ...SAVED_DESIGN,
        layers: Array.from({ length: 60 }, (_, index) => ({
          ...SAVED_DESIGN.layers[0],
          id: `layer-${index}`,
          kind: index === 0 ? "text" : ("shape" as const),
          locked: false,
        })),
      },
    };
    const result = await call(
      "edit_invitation_layers",
      { eventId: EVENT_ID, addShape: { kind: "shape", shape: "star" } },
      context(fakeClient({ data: full, error: null }))
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/at most 60/);
    expect(mockedSaveDesign).not.toHaveBeenCalled();
  });

  it("refuses a read-only connection and an out-of-scope event", async () => {
    const readOnly = await call(
      "edit_invitation_layers",
      { eventId: EVENT_ID, move: [{ layerId: "names", x: 10 }] },
      context(fakeClient({ data: EVENT_ROW, error: null }), {
        readOnly: true,
      })
    );
    expect(readOnly.isError).toBe(true);
    expect(textOf(readOnly)).toBe(READ_ONLY);

    const scoped = await call(
      "edit_invitation_layers",
      { eventId: OTHER_EVENT_ID, move: [{ layerId: "names", x: 10 }] },
      context(fakeClient({ data: EVENT_ROW, error: null }), {
        scope: false,
      })
    );
    expect(scoped.isError).toBe(true);
    expect(textOf(scoped)).toBe(OUT_OF_SCOPE);
    expect(mockedSaveDesign).not.toHaveBeenCalled();
  });
});

describe("apply_invitation_look", () => {
  it("applies a theme without touching the words", async () => {
    const result = await call("apply_invitation_look", {
      eventId: EVENT_ID,
      theme: "emerald_regal",
    });

    expect(result.isError).toBeFalsy();
    expect(jsonOf<{ summary: string }>(result).summary).toMatch(
      /Emerald Regal/i
    );

    const savedDesign = mockedSaveDesign.mock.calls[0][1] as InvitationDesign;
    expect(savedDesign.theme).toBe("emerald_regal");
    expect(savedDesign.layers.find((layer) => layer.id === "names")?.text).toBe(
      SAVED_DESIGN.layers.find((layer) => layer.id === "names")?.text
    );
  });

  it("applies a layout preset and keeps the entry seal", async () => {
    const withSeal = {
      ...EVENT_ROW,
      invitation_design: {
        ...SAVED_DESIGN,
        layers: [
          ...SAVED_DESIGN.layers,
          {
            ...SAVED_DESIGN.layers[0],
            id: "seal-code-1",
            kind: "code",
            text: "",
            x: 5,
            y: 83.5,
            width: 19,
          },
        ],
      },
    };
    const result = await call(
      "apply_invitation_look",
      { eventId: EVENT_ID, layoutPreset: "cathedral" },
      context(fakeClient({ data: withSeal, error: null }))
    );

    expect(result.isError).toBeFalsy();
    const savedDesign = mockedSaveDesign.mock.calls[0][1] as InvitationDesign;
    expect(savedDesign.layers.some((layer) => layer.kind === "code")).toBe(
      true
    );
    expect(
      savedDesign.layers.find((layer) => layer.kind === "names")?.text
    ).toBe(
      withSeal.invitation_design.layers.find((layer) => layer.id === "names")
        ?.text
    );
  });

  it("refuses a read-only connection and an out-of-scope event", async () => {
    const readOnly = await call(
      "apply_invitation_look",
      { eventId: EVENT_ID, theme: "emerald_regal" },
      context(fakeClient({ data: EVENT_ROW, error: null }), {
        readOnly: true,
      })
    );
    expect(readOnly.isError).toBe(true);
    expect(textOf(readOnly)).toBe(READ_ONLY);

    const scoped = await call(
      "apply_invitation_look",
      { eventId: OTHER_EVENT_ID, theme: "emerald_regal" },
      context(fakeClient({ data: EVENT_ROW, error: null }), {
        scope: false,
      })
    );
    expect(scoped.isError).toBe(true);
    expect(textOf(scoped)).toBe(OUT_OF_SCOPE);
    expect(mockedSaveDesign).not.toHaveBeenCalled();
  });
});

describe("edit_invitation_styles", () => {
  it("creates a style from a layer, applies it and rewrites it across followers", async () => {
    const created = await call("edit_invitation_styles", {
      eventId: EVENT_ID,
      createFromLayerId: "names",
      createName: "Names",
    });
    expect(created.isError).toBeFalsy();
    const styleId = jsonOf<{ createdStyleId: string }>(created).createdStyleId;
    expect(styleId).toMatch(/^style-/);

    const styled = mockedSaveDesign.mock.calls[0][1] as InvitationDesign;
    expect(styled.layers.find((layer) => layer.id === "names")?.styleId).toBe(
      styleId
    );

    // Put the new style on the kicker: the kicker takes on the names' look.
    const styledRow = { ...EVENT_ROW, invitation_design: styled };
    const applied = await call(
      "edit_invitation_styles",
      {
        eventId: EVENT_ID,
        applyStyleId: styleId,
        applyLayerIds: ["kicker"],
      },
      context(fakeClient({ data: styledRow, error: null }))
    );
    expect(applied.isError).toBeFalsy();
    const following = mockedSaveDesign.mock.calls[1][1] as InvitationDesign;
    expect(following.layers.find((layer) => layer.id === "kicker")?.font).toBe(
      styled.layers.find((layer) => layer.id === "names")?.font
    );

    // Rewriting the style from the kicker changes every follower.
    const followingRow = { ...EVENT_ROW, invitation_design: following };
    const rewritten = await call(
      "edit_invitation_styles",
      {
        eventId: EVENT_ID,
        updateStyleId: styleId,
        updateFromLayerId: "kicker",
      },
      context(fakeClient({ data: followingRow, error: null }))
    );
    expect(rewritten.isError).toBeFalsy();
    expect(jsonOf<{ summary: string }>(rewritten).summary).toMatch(
      new RegExp(styleId)
    );
  });

  it("refuses an unknown style id", async () => {
    const result = await call("edit_invitation_styles", {
      eventId: EVENT_ID,
      applyStyleId: "style-nope",
      applyLayerIds: ["kicker"],
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/no brand style/);
    expect(mockedSaveDesign).not.toHaveBeenCalled();
  });

  it("refuses a read-only connection and an out-of-scope event", async () => {
    const readOnly = await call(
      "edit_invitation_styles",
      {
        eventId: EVENT_ID,
        createFromLayerId: "names",
        createName: "Names",
      },
      context(fakeClient({ data: EVENT_ROW, error: null }), {
        readOnly: true,
      })
    );
    expect(readOnly.isError).toBe(true);
    expect(textOf(readOnly)).toBe(READ_ONLY);

    const scoped = await call(
      "edit_invitation_styles",
      {
        eventId: OTHER_EVENT_ID,
        createFromLayerId: "names",
        createName: "Names",
      },
      context(fakeClient({ data: EVENT_ROW, error: null }), {
        scope: false,
      })
    );
    expect(scoped.isError).toBe(true);
    expect(textOf(scoped)).toBe(OUT_OF_SCOPE);
    expect(mockedSaveDesign).not.toHaveBeenCalled();
  });
});

describe("replace_invitation_design", () => {
  it("replaces the whole card and keeps the entry seal", async () => {
    const replacement: InvitationDesign = {
      ...SAVED_DESIGN,
      theme: "emerald_regal",
    };
    const result = await call("replace_invitation_design", {
      eventId: EVENT_ID,
      design: replacement,
    });

    expect(result.isError).toBeFalsy();
    expect(jsonOf<{ summary: string }>(result).summary).toMatch(
      /replaced the whole design/
    );
    const savedDesign = mockedSaveDesign.mock.calls[0][1] as InvitationDesign;
    expect(savedDesign.theme).toBe("emerald_regal");
    expect(savedDesign.layers.some((layer) => layer.kind === "code")).toBe(
      true
    );
    expect(mockedSaveVersion).toHaveBeenCalledWith(
      EVENT_ID,
      expect.stringMatching(/^Before AI: /),
      expect.objectContaining({ version: 1 })
    );
  });

  it("refuses an invalid design with the exact paths that failed", async () => {
    const invalid = {
      ...SAVED_DESIGN,
      theme: "not_a_theme",
      layers: [
        ...SAVED_DESIGN.layers.slice(0, 2),
        { ...SAVED_DESIGN.layers[2], size: 99 },
      ],
    };
    const result = await call("replace_invitation_design", {
      eventId: EVENT_ID,
      design: invalid,
    });

    expect(result.isError).toBe(true);
    const message = textOf(result);
    expect(message).toMatch(/theme/);
    expect(message).toMatch(/layers\.2\.size/);
    expect(mockedSaveDesign).not.toHaveBeenCalled();
    expect(mockedSaveVersion).not.toHaveBeenCalled();
  });

  it("refuses a read-only connection and an out-of-scope event", async () => {
    const readOnly = await call(
      "replace_invitation_design",
      { eventId: EVENT_ID, design: SAVED_DESIGN },
      context(fakeClient({ data: EVENT_ROW, error: null }), {
        readOnly: true,
      })
    );
    expect(readOnly.isError).toBe(true);
    expect(textOf(readOnly)).toBe(READ_ONLY);

    const scoped = await call(
      "replace_invitation_design",
      { eventId: OTHER_EVENT_ID, design: SAVED_DESIGN },
      context(fakeClient({ data: EVENT_ROW, error: null }), {
        scope: false,
      })
    );
    expect(scoped.isError).toBe(true);
    expect(textOf(scoped)).toBe(OUT_OF_SCOPE);
    expect(mockedSaveDesign).not.toHaveBeenCalled();
  });
});

describe("none of the five tools sends", () => {
  it("never reaches the sending code, whatever each tool writes", async () => {
    await call("edit_invitation_text", {
      eventId: EVENT_ID,
      edits: [{ layerId: "names", text: "Ada & Obi" }],
    });
    await call("edit_invitation_layers", {
      eventId: EVENT_ID,
      move: [{ layerId: "names", x: 10, y: 20 }],
    });
    await call("apply_invitation_look", {
      eventId: EVENT_ID,
      theme: "emerald_regal",
    });
    await call("edit_invitation_styles", {
      eventId: EVENT_ID,
      createFromLayerId: "names",
      createName: "Headline",
    });
    await call("replace_invitation_design", {
      eventId: EVENT_ID,
      design: SAVED_DESIGN,
    });

    expect(mockedSendInvite).not.toHaveBeenCalled();
    expect(mockedSendReminders).not.toHaveBeenCalled();
    expect(mockedDispatchEmail).not.toHaveBeenCalled();
    expect(mockedSaveDesign).toHaveBeenCalledTimes(5);
  });
});
