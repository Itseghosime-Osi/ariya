import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { UNKNOWN_APP_ACKNOWLEDGEMENT } from "./app-trust";
import { decideConsentAction } from "./consent";

const mockedCreateClient = vi.mocked(createClient);

const CLAUDE = "https://claude.ai/api/mcp/auth_callback";
const LOCAL = "http://localhost:3118/callback";
const STRANGER = "https://claude.ai.evil.com/api/mcp/auth_callback";

function authorizationDetails(redirectUri: string, clientName = "Some App") {
  return {
    authorization_id: "auth-1",
    redirect_uri: redirectUri,
    client: { id: "client-1", name: clientName, logo_uri: "", uri: "" },
    user: { id: "user-1", email: "host@example.com" },
    scope: "openid email",
  };
}

function installSupabase(
  details: unknown,
  { signedIn = true, detailsError = null as unknown } = {}
) {
  const oauth = {
    getAuthorizationDetails: vi
      .fn()
      .mockResolvedValue({ data: details, error: detailsError }),
    approveAuthorization: vi.fn().mockResolvedValue({
      data: { redirect_url: "https://claude.ai/api/mcp/auth_callback?code=c" },
      error: null,
    }),
    denyAuthorization: vi.fn().mockResolvedValue({
      data: { redirect_url: "https://claude.ai/api/mcp/auth_callback?error=x" },
      error: null,
    }),
  };

  mockedCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: signedIn ? { id: "user-1" } : null },
        error: null,
      }),
      oauth,
    },
  } as never);

  return oauth;
}

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("decideConsentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approves a known app without any acknowledgement", async () => {
    const oauth = installSupabase(authorizationDetails(CLAUDE));

    const state = await decideConsentAction(
      null,
      form({ authorization_id: "auth-1", decision: "approve" })
    );

    expect(state).toEqual({
      ok: true,
      redirectUrl: "https://claude.ai/api/mcp/auth_callback?code=c",
    });
    expect(oauth.approveAuthorization).toHaveBeenCalledOnce();
  });

  it("approves a local app without any acknowledgement", async () => {
    const oauth = installSupabase(authorizationDetails(LOCAL));

    const state = await decideConsentAction(
      null,
      form({ authorization_id: "auth-1", decision: "approve" })
    );

    expect(state.ok).toBe(true);
    expect(oauth.approveAuthorization).toHaveBeenCalledOnce();
  });

  it("refuses an unknown app that was not acknowledged", async () => {
    const oauth = installSupabase(authorizationDetails(STRANGER));

    const state = await decideConsentAction(
      null,
      form({ authorization_id: "auth-1", decision: "approve" })
    );

    expect(state).toMatchObject({ ok: false });
    expect(oauth.approveAuthorization).not.toHaveBeenCalled();
  });

  it("refuses a stranger that calls itself Claude", async () => {
    const oauth = installSupabase(authorizationDetails(STRANGER, "Claude"));

    const state = await decideConsentAction(
      null,
      form({ authorization_id: "auth-1", decision: "approve" })
    );

    expect(state).toMatchObject({ ok: false });
    expect(oauth.approveAuthorization).not.toHaveBeenCalled();
  });

  it("approves an acknowledged unknown app", async () => {
    const oauth = installSupabase(authorizationDetails(STRANGER));

    const state = await decideConsentAction(
      null,
      form({
        authorization_id: "auth-1",
        decision: "approve",
        acknowledge_unknown_app: UNKNOWN_APP_ACKNOWLEDGEMENT,
      })
    );

    expect(state.ok).toBe(true);
    expect(oauth.approveAuthorization).toHaveBeenCalledOnce();
  });

  it("ignores an acknowledgement value the form made up", async () => {
    const oauth = installSupabase(authorizationDetails(STRANGER));

    const state = await decideConsentAction(
      null,
      form({
        authorization_id: "auth-1",
        decision: "approve",
        acknowledge_unknown_app: "true",
      })
    );

    expect(state).toMatchObject({ ok: false });
    expect(oauth.approveAuthorization).not.toHaveBeenCalled();
  });

  it("lets an unknown app be denied without the acknowledgement", async () => {
    const oauth = installSupabase(authorizationDetails(STRANGER));

    const state = await decideConsentAction(
      null,
      form({ authorization_id: "auth-1", decision: "deny" })
    );

    expect(state.ok).toBe(true);
    expect(oauth.denyAuthorization).toHaveBeenCalledOnce();
  });

  it("stops when the request has expired", async () => {
    const oauth = installSupabase(null, { detailsError: { message: "gone" } });

    const state = await decideConsentAction(
      null,
      form({ authorization_id: "auth-1", decision: "approve" })
    );

    expect(state).toMatchObject({ ok: false });
    expect(oauth.approveAuthorization).not.toHaveBeenCalled();
  });

  it("stops when nobody is signed in", async () => {
    const oauth = installSupabase(authorizationDetails(CLAUDE), {
      signedIn: false,
    });

    const state = await decideConsentAction(
      null,
      form({ authorization_id: "auth-1", decision: "approve" })
    );

    expect(state).toMatchObject({ ok: false });
    expect(oauth.approveAuthorization).not.toHaveBeenCalled();
  });

  it("rejects a form with no authorization id", async () => {
    installSupabase(authorizationDetails(CLAUDE));

    const state = await decideConsentAction(
      null,
      form({ decision: "approve" })
    );

    expect(state).toMatchObject({ ok: false });
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("passes through the redirect Supabase returns when consent already exists", async () => {
    const oauth = installSupabase({
      redirect_url: "https://claude.ai/api/mcp/auth_callback?code=done",
    });

    const state = await decideConsentAction(
      null,
      form({ authorization_id: "auth-1", decision: "approve" })
    );

    expect(state).toEqual({
      ok: true,
      redirectUrl: "https://claude.ai/api/mcp/auth_callback?code=done",
    });
    expect(oauth.approveAuthorization).not.toHaveBeenCalled();
  });
});
