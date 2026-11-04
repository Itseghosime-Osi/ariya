import { describe, it, expect, vi, beforeEach } from "vitest";
import { dispatchRsvpEmail } from "./dispatcher";
import * as adminClientModule from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const mockResendSend = vi
  .fn()
  .mockResolvedValue({ data: { id: "re_msg_123" }, error: null });

vi.mock("resend", () => {
  return {
    Resend: class {
      emails = {
        send: mockResendSend,
      };
    },
  };
});

describe("dispatchRsvpEmail", () => {
  let mockInsert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(adminClientModule.createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as unknown as ReturnType<typeof adminClientModule.createAdminClient>);
  });

  it("dispatches successfully via mailpit transport", async () => {
    (serverEnv as { EMAIL_TRANSPORT: string }).EMAIL_TRANSPORT = "mailpit";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ID: "mp-123" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await dispatchRsvpEmail({
      eventId: "e-1",
      guestId: "g-1",
      recipientEmail: "test@example.com",
      subject: "Test Subject",
      templateType: "accepted",
      html: "<p>Hello</p>",
    });

    expect(res.success).toBe(true);
    expect(res.providerId).toBe("mp-123");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "sent",
        provider_id: "mp-123",
        error_class: null,
      })
    );
  });

  it("logs failure and error class when mailpit returns non-ok", async () => {
    (serverEnv as { EMAIL_TRANSPORT: string }).EMAIL_TRANSPORT = "mailpit";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await dispatchRsvpEmail({
      eventId: "e-1",
      guestId: "g-1",
      recipientEmail: "test@example.com",
      subject: "Test Subject",
      templateType: "accepted",
      html: "<p>Hello</p>",
    });

    expect(res.success).toBe(false);
    expect(res.providerId).toBeUndefined();
    expect(res.error).toBe("MailpitHttpError_500");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        provider_id: null,
        error_class: "MailpitHttpError_500",
      })
    );
  });

  it("dispatches successfully via resend transport", async () => {
    (serverEnv as { EMAIL_TRANSPORT: string }).EMAIL_TRANSPORT = "resend";
    (serverEnv as { RESEND_API_KEY: string }).RESEND_API_KEY =
      "re_live_valid_key_123";

    const res = await dispatchRsvpEmail({
      eventId: "e-1",
      guestId: "g-1",
      recipientEmail: "test@example.com",
      subject: "Test Subject",
      templateType: "accepted",
      html: "<p>Hello</p>",
    });

    expect(res.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "sent",
        recipient_email: "test@example.com",
      })
    );
  });
});
