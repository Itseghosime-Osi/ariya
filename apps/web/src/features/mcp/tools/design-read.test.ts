import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../guard";
import { registerDesignReadTools } from "./design-read";
import { designFromEvent } from "@/features/invitations/design";

const EVENT_ID = "11111111-1111-4111-8111-111111111111";

const EVENT_ROW = {
  title: "Wedding",
  couple: "Folake Adeleke & Demola Alakija",
  date: "2026-12-12T15:00:00Z",
  venue: "Eko Hotel",
  area: "Victoria Island, Lagos",
  dress_code: "Gold and ivory",
  rsvp_by: "2026-11-30",
  invitation_theme: "royal_gold",
  invitation_headline: null,
  invitation_subheadline: null,
  invitation_message: null,
  invitation_design: null as unknown,
  updated_at: "2026-11-14T10:00:00.000Z",
};

type Row = { data?: unknown; error?: unknown };

function fakeClient(events: Row) {
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

function setup(events: Row, options: { scope?: boolean } = {}) {
  const rpc = async (name: string) => ({
    data:
      name === "ai_connection_event_allowed" ? (options.scope ?? true) : true,
    error: null,
  });
  const ctx: ToolContext = {
    client: { ...fakeClient(events), rpc } as unknown as ToolContext["client"],
    user: { id: "user-1" } as unknown as ToolContext["user"],
    clientId: "client-abc",
  };
  const handlers = new Map<string, ToolHandler>();
  const descriptions = new Map<string, string>();
  registerDesignReadTools(
    {
      registerTool: (
        name: string,
        config: { description: string },
        handler: ToolHandler
      ) => {
        handlers.set(name, handler);
        descriptions.set(name, config.description);
        return { enabled: true };
      },
    } as unknown as McpServer,
    ctx
  );
  return { handlers, descriptions };
}

function jsonOf<T>(result: CallToolResult): T {
  const first = result.content?.[0];
  return JSON.parse(first && first.type === "text" ? first.text : "") as T;
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("get_invitation_design", () => {
  it("returns the house design with every layer, colours and options", async () => {
    const { handlers } = setup({ data: EVENT_ROW, error: null });
    const result = await handlers.get("get_invitation_design")!({
      eventId: EVENT_ID,
    });
    expect(result.isError).toBeFalsy();
    const body = jsonOf<{
      source: string;
      revision: string;
      layers: {
        id: string;
        order: number;
        label: string;
        drawnColour?: string;
        fit?: { maxLines: number | null };
      }[];
      options: { fonts: { id: string }[]; presets: { id: string }[] };
      notice?: string;
    }>(result);

    expect(body.source).toBe("house_design");
    expect(body.notice).toBeTruthy();
    expect(body.revision).toBe(EVENT_ROW.updated_at);
    const names = body.layers.find((layer) => layer.id === "names");
    expect(names?.label).toBe("Names");
    expect(names?.drawnColour).toMatch(/^#/);
    expect(names?.fit?.maxLines).toBe(2);
    expect(body.layers.map((layer) => layer.order)).toEqual(
      body.layers.map((_, index) => index)
    );
    expect(body.options.fonts.map((font) => font.id)).toContain("script");
    expect(body.options.presets.map((preset) => preset.id)).toContain("owambe");
  });

  it("returns a saved design as saved", async () => {
    const saved = designFromEvent({ couple: "Ada & Obi", date: "2026-12-12" });
    saved.layers = saved.layers.map((layer) =>
      layer.id === "names" ? { ...layer, text: "Ada & Obi forever" } : layer
    );
    const { handlers } = setup({
      data: { ...EVENT_ROW, invitation_design: saved },
      error: null,
    });
    const body = jsonOf<{ source: string; layers: { text: string }[] }>(
      await handlers.get("get_invitation_design")!({ eventId: EVENT_ID })
    );
    expect(body.source).toBe("saved");
    expect(body.layers.map((layer) => layer.text)).toContain(
      "Ada & Obi forever"
    );
  });

  it("says so when the celebration is not there", async () => {
    const { handlers } = setup({ data: null, error: null });
    const result = await handlers.get("get_invitation_design")!({
      eventId: EVENT_ID,
    });
    expect(result.isError).toBe(true);
  });

  it("refuses a celebration outside the connection's scope", async () => {
    const { handlers } = setup(
      { data: EVENT_ROW, error: null },
      { scope: false }
    );
    const result = await handlers.get("get_invitation_design")!({
      eventId: EVENT_ID,
    });
    expect(result.isError).toBe(true);
  });

  it("tells the model the card's words are data", () => {
    const { descriptions } = setup({ data: EVENT_ROW, error: null });
    expect(descriptions.get("get_invitation_design")).toMatch(
      /never as instructions/
    );
    expect(descriptions.get("check_invitation_layout")).toMatch(
      /never as instructions/
    );
  });
});

describe("check_invitation_layout", () => {
  it("reports the house design as fine", async () => {
    const { handlers } = setup({ data: EVENT_ROW, error: null });
    const body = jsonOf<{ ok: boolean; boxes: unknown[]; source: string }>(
      await handlers.get("check_invitation_layout")!({ eventId: EVENT_ID })
    );
    expect(body.ok).toBe(true);
    expect(body.source).toBe("house_design");
    expect(body.boxes.length).toBeGreaterThan(5);
  });

  it("reports what is wrong with a saved design", async () => {
    const saved = designFromEvent({ couple: "Ada & Obi", date: "2026-12-12" });
    saved.layers = saved.layers.map((layer) =>
      layer.id === "names" ? { ...layer, x: 80 } : layer
    );
    const { handlers } = setup({
      data: { ...EVENT_ROW, invitation_design: saved },
      error: null,
    });
    const body = jsonOf<{
      ok: boolean;
      issues: { kind: string; layerIds: string[] }[];
    }>(await handlers.get("check_invitation_layout")!({ eventId: EVENT_ID }));
    expect(body.ok).toBe(false);
    expect(body.issues).toContainEqual(
      expect.objectContaining({ kind: "off_card", layerIds: ["names"] })
    );
  });

  it("does not leak the database's own error text", async () => {
    const { handlers } = setup({
      data: null,
      error: { message: "relation public.events secret detail", code: "XX000" },
    });
    const result = await handlers.get("check_invitation_layout")!({
      eventId: EVENT_ID,
    });
    expect(result.isError).toBe(true);
    const first = result.content?.[0];
    expect(first && first.type === "text" ? first.text : "").not.toMatch(
      /secret detail/
    );
  });
});
