import { test, expect, type APIRequestContext } from "@playwright/test";
import { createAndLoginUser, type TestUser } from "./fixtures/test-helpers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const TOOL_NAMES = [
  "whoami",
  "list_events",
  "get_event_overview",
  "list_guests",
  "get_rsvp_summary",
  "list_tables_and_seating",
  "create_event",
  "update_event",
  "add_guest",
  "update_guest",
  "import_guests",
  "update_invitation_design",
  "propose_send_invitations",
  "propose_send_reminders",
  "list_my_proposals",
];

let nextRequestId = 1;

/** A real access token, the same way the app would get one. */
async function accessToken(
  request: APIRequestContext,
  user: TestUser
): Promise<string> {
  const response = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: ANON_KEY, "content-type": "application/json" },
      data: { email: user.email, password: user.password },
    }
  );

  expect(response.status(), await response.text()).toBe(200);
  const body = (await response.json()) as { access_token?: string };
  expect(body.access_token).toBeTruthy();
  return body.access_token as string;
}

function mcpHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

async function jsonRpc(
  request: APIRequestContext,
  token: string | undefined,
  method: string,
  params?: unknown
) {
  return request.post("/mcp", {
    headers: mcpHeaders(token),
    data: {
      jsonrpc: "2.0",
      id: nextRequestId++,
      method,
      ...(params === undefined ? {} : { params }),
    },
  });
}

interface ToolReply {
  isError: boolean;
  text: string;
  body: Record<string, unknown>;
}

async function callTool(
  request: APIRequestContext,
  token: string,
  name: string,
  args: Record<string, unknown>
): Promise<ToolReply> {
  const response = await jsonRpc(request, token, "tools/call", {
    name,
    arguments: args,
  });
  expect(response.status(), `${name} transport`).toBe(200);

  const body = (await response.json()) as {
    result?: { isError?: boolean; content?: { text?: string }[] };
  };

  return {
    isError: Boolean(body.result?.isError),
    text: body.result?.content?.[0]?.text ?? "",
    body: body as unknown as Record<string, unknown>,
  };
}

function payload(reply: ToolReply): Record<string, unknown> {
  return JSON.parse(reply.text) as Record<string, unknown>;
}

function guestRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    name: `Guest ${index + 1}`,
  }));
}

test.describe("MCP endpoint", () => {
  test("rejects a caller with no token before it touches anything", async ({
    request,
  }) => {
    const response = await jsonRpc(request, undefined, "tools/list");

    expect(response.status()).toBe(401);
    expect(response.headers()["www-authenticate"]).toContain(
      "resource_metadata="
    );
    expect(await response.text()).not.toContain("list_events");
  });

  test("serves protected-resource metadata at both well-known paths", async ({
    request,
  }) => {
    for (const path of [
      "/.well-known/oauth-protected-resource",
      "/.well-known/oauth-protected-resource/mcp",
    ]) {
      const response = await request.get(path);

      expect(response.status(), path).toBe(200);
      expect(response.headers()["content-type"], path).toContain(
        "application/json"
      );

      const body = (await response.json()) as {
        resource: string;
        authorization_servers: string[];
        bearer_methods_supported: string[];
      };
      expect(body.resource, path).toMatch(/\/mcp$/);
      expect(body.authorization_servers[0], path).toMatch(/\/auth\/v1$/);
      expect(body.bearer_methods_supported, path).toEqual(["header"]);
    }
  });

  test("initialises, lists its tools and works a celebration end to end", async ({
    page,
    context,
    request,
  }) => {
    const user = await createAndLoginUser(page, context, "mcp_host");
    const token = await accessToken(request, user);

    const initialise = await jsonRpc(request, token, "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "playwright", version: "1.0.0" },
    });
    expect(initialise.status()).toBe(200);
    expect((await initialise.json()).result.serverInfo.name).toBe("ariya");

    const list = await jsonRpc(request, token, "tools/list");
    const listed = (await list.json()) as {
      result: { tools: { name: string }[] };
    };
    expect(listed.result.tools.map((tool) => tool.name).sort()).toEqual(
      [...TOOL_NAMES].sort()
    );

    const created = await callTool(request, token, "create_event", {
      title: `MCP Celebration ${Date.now()}`,
      couple: "Adaeze & Emeka",
      date: "2027-06-12",
      venue: "Oriental Hotel, Lekki",
      area: "Lagos",
    });
    expect(created.isError).toBe(false);
    const { eventId } = payload(created) as { eventId: string };
    expect(eventId).toMatch(/^[0-9a-f-]{36}$/);

    const added = await callTool(request, token, "add_guest", {
      eventId,
      name: "The Okonkwo family",
      partySize: 4,
    });
    expect(added.isError).toBe(false);
    expect(payload(added).guestId).toBeTruthy();

    const guests = await callTool(request, token, "list_guests", { eventId });
    expect(guests.isError).toBe(false);
    const listBody = payload(guests) as {
      items: unknown[];
      totalCount: number;
    };
    expect(listBody.totalCount).toBe(1);
    expect(guests.text).toContain("The Okonkwo family");

    const summary = await callTool(request, token, "get_rsvp_summary", {
      eventId,
    });
    expect(summary.isError).toBe(false);
    expect(payload(summary)).toMatchObject({
      totalCount: 1,
      acceptedCount: 0,
      pendingCount: 1,
    });

    const listedEvents = await callTool(request, token, "list_events", {
      search: "Adaeze",
    });
    expect(listedEvents.isError).toBe(false);
  });

  test("whoami tells a password-grant token it is an ordinary session", async ({
    page,
    context,
    request,
  }) => {
    const user = await createAndLoginUser(page, context, "mcp_whoami");
    const token = await accessToken(request, user);

    const reply = await callTool(request, token, "whoami", {});

    expect(reply.isError).toBe(false);
    // No client_id claim on a password grant, so the database treats it as the host's own session.
    expect(payload(reply)).toEqual({
      clientId: null,
      databaseTreatsThisTokenAsApp: false,
    });
  });

  test("refuses another host and writes nothing on the first host's celebration", async ({
    page,
    context,
    browser,
    request,
  }) => {
    const owner = await createAndLoginUser(page, context, "mcp_owner");
    const ownerToken = await accessToken(request, owner);

    const created = await callTool(request, ownerToken, "create_event", {
      title: `Private Celebration ${Date.now()}`,
      couple: "Bisi & Femi",
      date: "2027-09-04",
      venue: "Eko Hotel, Victoria Island",
    });
    const { eventId } = payload(created) as { eventId: string };

    // A separate browser so the second host gets their own session.
    const otherContext = await browser.newContext();
    try {
      const otherPage = await otherContext.newPage();
      const stranger = await createAndLoginUser(
        otherPage,
        otherContext,
        "mcp_stranger"
      );
      const strangerToken = await accessToken(request, stranger);

      const refused = await callTool(request, strangerToken, "add_guest", {
        eventId,
        name: "Should never be written",
        partySize: 2,
      });
      expect(refused.isError).toBe(true);
      expect(refused.text).toContain("do not have access");

      const readAttempt = await callTool(
        request,
        strangerToken,
        "get_rsvp_summary",
        { eventId }
      );
      expect(readAttempt.isError).toBe(true);
      expect(readAttempt.text).toContain("do not have access");

      const stillEmpty = await callTool(request, ownerToken, "list_guests", {
        eventId,
      });
      expect(payload(stillEmpty).totalCount).toBe(0);
      expect(stillEmpty.text).not.toContain("Should never be written");
    } finally {
      await otherContext.close();
    }
  });

  test("rejects an import of 201 guests and writes nothing", async ({
    page,
    context,
    request,
  }) => {
    const user = await createAndLoginUser(page, context, "mcp_import");
    const token = await accessToken(request, user);

    const created = await callTool(request, token, "create_event", {
      title: `Import Celebration ${Date.now()}`,
      couple: "Ngozi & Chidi",
      date: "2027-11-20",
      venue: "Transcorp Hilton, Abuja",
    });
    const { eventId } = payload(created) as { eventId: string };

    const response = await jsonRpc(request, token, "tools/call", {
      name: "import_guests",
      arguments: { eventId, guests: guestRows(201) },
    });
    expect(response.status()).toBe(200);

    // Whether the SDK reports it as a tool error or a protocol error, the cap is named.
    expect(await response.text()).toContain("at most 200 guests");

    const guests = await callTool(request, token, "list_guests", { eventId });
    expect(payload(guests).totalCount).toBe(0);
  });
});

test.describe("Consent screen", () => {
  test("explains an incomplete connection link", async ({ page }) => {
    await page.goto("/oauth/consent");

    await expect(
      page.getByText(/This connection link is incomplete/i)
    ).toBeVisible();
  });

  test("sends a signed-out visitor to sign in and back again", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto("/oauth/consent?authorization_id=test-authorization-id");

      await page.waitForURL(/\/sign-in\?next=/, { timeout: 15000 });

      const next = new URL(page.url()).searchParams.get("next") ?? "";
      expect(next).toBe(
        "/oauth/consent?authorization_id=test-authorization-id"
      );
    } finally {
      await context.close();
    }
  });
});
