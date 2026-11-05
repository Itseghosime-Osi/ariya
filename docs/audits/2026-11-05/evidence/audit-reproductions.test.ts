// @vitest-environment node
import { it, expect, vi } from "vitest";
import crypto from "node:crypto";
import net from "node:net";
import webpush from "web-push";

it("audit: signup confirms an unverified email if both mailers fail", async () => {
  vi.resetModules();
  const updateUserById = vi.fn().mockResolvedValue({ error: null });
  vi.doMock("@/lib/env/client", () => ({
    clientEnv: { NEXT_PUBLIC_APP_URL: "https://ariya.test" },
  }));
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: async () => ({
      auth: {
        signUp: async () => ({
          error: {
            code: "over_email_send_rate_limit",
            message: "email rate limit",
          },
        }),
        signInWithPassword: async () => ({ error: null }),
      },
    }),
  }));
  vi.doMock("@/lib/supabase/admin", () => ({
    createAdminClient: () => ({
      auth: {
        admin: {
          generateLink: async () => ({
            data: {
              user: { id: "audit-new-account" },
              properties: { hashed_token: "audit-hash" },
            },
            error: null,
          }),
          updateUserById,
        },
      },
    }),
  }));
  vi.doMock("@/lib/email/auth-mail", () => ({
    sendAuthEmail: async () => false,
  }));
  vi.doMock("@/lib/rate-limit", () => ({
    checkRateLimit: async () => ({ success: true }),
    getClientIpHmac: async () => "audit-ip",
  }));
  vi.doMock("@react-email/components", () => ({
    render: async () => "<p>audit</p>",
  }));
  vi.doMock("@/emails/AuthLinkEmail", () => ({ AuthLinkEmail: () => null }));
  vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
  const { signUpAction } = await import("@/features/auth/actions");
  const result = await signUpAction({
    fullName: "Audit User",
    email: "unverified@example.invalid",
    password: "AuditPassword123!",
    confirmPassword: "AuditPassword123!",
    role: "couple",
    agreeTerms: true,
  });
  expect(updateUserById).toHaveBeenCalledWith("audit-new-account", {
    email_confirm: true,
  });
  expect(result).toEqual({ ok: true, data: { hasSession: true } });
  console.log(
    "AUTH CONFIRMED: failed delivery caused email_confirm=true and authenticated success"
  );
});

it("audit: real push transport opens a connection to a user-controlled loopback endpoint", async () => {
  vi.resetModules();
  const vapid = webpush.generateVAPIDKeys();
  const ec = crypto.createECDH("prime256v1");
  ec.generateKeys();
  let reached = false;
  const server = net.createServer((s) => {
    reached = true;
    s.destroy();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as net.AddressInfo).port;
  const sub = {
    id: "audit-device",
    endpoint: `https://127.0.0.1:${port}/audit`,
    p256dh: ec.getPublicKey().toString("base64url"),
    auth: crypto.randomBytes(16).toString("base64url"),
  };
  vi.doMock("@/lib/env/client", () => ({
    clientEnv: {
      NEXT_PUBLIC_APP_URL: "https://ariya.test",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: vapid.publicKey,
    },
  }));
  vi.doMock("@/lib/env/server", () => ({
    serverEnv: { VAPID_PRIVATE_KEY: vapid.privateKey },
  }));
  vi.doMock("@/lib/supabase/admin", () => ({
    createAdminClient: () => ({
      from: () => ({ select: () => ({ in: async () => ({ data: [sub] }) }) }),
    }),
  }));
  try {
    const { pushSubscriptionSchema } =
      await import("@/features/notifications/schemas");
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }).success
    ).toBe(true);
    const { sendPushToUsers } = await import("@/lib/push");
    await sendPushToUsers(["audit-user"], {
      title: "audit",
      body: "audit",
      url: "/profile",
    });
    expect(reached).toBe(true);
    console.log(
      "SSRF CONFIRMED: actual web-push transport reached loopback; no response body was exposed"
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

it("audit: invitation delivery interpolates raw HTML and ignores tracking failure", async () => {
  vi.resetModules();
  const dispatch = vi.fn().mockResolvedValue({ success: true });
  const rpc = vi
    .fn()
    .mockImplementation(async (name: string) =>
      name === "track_invitations_sent"
        ? { error: { code: "42501", message: "NOT_PERMITTED" } }
        : { data: true, error: null }
    );
  const guest = {
    name: 'Audit <a href="https://example.invalid/audit">Injected link</a>',
    email: "audit@example.invalid",
    rsvp_token: "audit-token",
  };
  const event = {
    title: "Audit",
    couple: "Audit Couple",
    date: "2027-12-10",
    venue: "Audit",
  };
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: async () => ({
      rpc,
      from: (_table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: guest }) }),
            single: async () => ({ data: event }),
          }),
        }),
      }),
    }),
  }));
  vi.doMock("@/lib/email/dispatcher", () => ({ dispatchRsvpEmail: dispatch }));
  const { sendGuestInvitationEmailAction } =
    await import("@/features/invitations/actions");
  const res = await sendGuestInvitationEmailAction(
    "audit-event",
    "audit-guest"
  );
  expect(dispatch.mock.calls[0][0].html).toContain(
    '<a href="https://example.invalid/audit">Injected link</a>'
  );
  expect(res).toEqual({ success: true });
  expect(rpc).toHaveBeenCalledWith("track_invitations_sent", {
    p_guest_ids: ["audit-guest"],
  });
  console.log(
    "EMAIL CONFIRMED: raw HTML reached delivery; denied invitation tracking still returned success"
  );
});

it("audit: importing 501 rows silently reports and retains only 500", async () => {
  const { parseGuestCsvContent, autoDetectColumnMapping } =
    await import("@/features/guests/csv-parser");
  const csv =
    "name,email\n" +
    Array.from(
      { length: 501 },
      (_, i) => `Audit Guest ${i},audit${i}@example.invalid`
    ).join("\n");
  const res = parseGuestCsvContent(
    csv,
    autoDetectColumnMapping(["name", "email"])
  );
  expect(res.validRows).toHaveLength(500);
  expect(res.totalRows).toBe(500);
  expect(res.errorRows).toHaveLength(0);
  console.log(
    "CSV CONFIRMED: input 501, reported 500, no error for omitted row"
  );
});
