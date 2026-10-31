import { beforeEach, describe, expect, it, vi } from "vitest";

const signUp = vi.fn();
const signInWithPassword = vi.fn();
const resetPasswordForEmail = vi.fn();
const generateLink = vi.fn();
const updateUserById = vi.fn();
const sendAuthEmail = vi.fn();
const checkRateLimit = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { signUp, signInWithPassword, resetPasswordForEmail },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { generateLink, updateUserById } },
  }),
}));
vi.mock("@/lib/email/auth-mail", () => ({ sendAuthEmail }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit,
  getClientIpHmac: async () => "ip",
}));
vi.mock("@/lib/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_APP_URL: "https://ariya.test" },
}));

const { signUpAction, forgotPasswordAction } = await import("./actions");

const input = {
  fullName: "Tolu Ade",
  email: "tolu@example.com",
  role: "couple" as const,
  password: "ValidPasscode1#",
  confirmPassword: "ValidPasscode1#",
  agreeTerms: true as const,
};
const mailerDown = {
  data: { user: null, session: null },
  error: {
    code: "unexpected_failure",
    message: "Error sending confirmation email",
  },
};

describe("sign-up when Supabase cannot send the confirmation email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimit.mockResolvedValue({ success: true, remaining: 4 });
    generateLink.mockResolvedValue({
      data: { user: { id: "u1" }, properties: { hashed_token: "hash123" } },
      error: null,
    });
  });

  it("leaves a normal sign-up alone", async () => {
    signUp.mockResolvedValue({ data: { session: {} }, error: null });
    const res = await signUpAction(input);
    expect(res).toEqual({ ok: true, data: { hasSession: true } });
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("sends the confirmation link through the app's own email instead", async () => {
    signUp.mockResolvedValue(mailerDown);
    sendAuthEmail.mockResolvedValue(true);
    const res = await signUpAction(input);
    expect(res).toEqual({ ok: true, data: { hasSession: false } });
    expect(generateLink).toHaveBeenCalledWith(
      expect.objectContaining({ type: "signup", email: "tolu@example.com" })
    );
    const mail = sendAuthEmail.mock.calls[0][0];
    expect(mail.to).toBe("tolu@example.com");
    expect(mail.html).toContain(
      "https://ariya.test/auth/confirm?token_hash=hash123&amp;type=signup"
    );
  });

  it("confirms and signs the person in if no email can go out at all", async () => {
    signUp.mockResolvedValue(mailerDown);
    sendAuthEmail.mockResolvedValue(false);
    signInWithPassword.mockResolvedValue({ error: null });
    const res = await signUpAction(input);
    expect(updateUserById).toHaveBeenCalledWith("u1", { email_confirm: true });
    expect(res).toEqual({ ok: true, data: { hasSession: true } });
  });

  it("does not reveal an email that is already registered", async () => {
    signUp.mockResolvedValue(mailerDown);
    generateLink.mockResolvedValue({
      data: null,
      error: { code: "email_exists", message: "already registered" },
    });
    const res = await signUpAction(input);
    expect(res).toEqual({ ok: true, data: { hasSession: false } });
    expect(sendAuthEmail).not.toHaveBeenCalled();
  });

  it("stops after too many attempts from one visitor", async () => {
    signUp.mockResolvedValue(mailerDown);
    checkRateLimit.mockResolvedValue({ success: false, remaining: 0 });
    const res = await signUpAction(input);
    expect(res.ok).toBe(false);
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("passes other sign-up errors straight through", async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "weak_password", message: "Password is too weak" },
    });
    const res = await signUpAction(input);
    expect(res.ok).toBe(false);
    expect(generateLink).not.toHaveBeenCalled();
  });
});

describe("passcode reset when Supabase cannot send the email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimit.mockResolvedValue({ success: true, remaining: 4 });
  });

  it("sends the reset link through the app's own email instead", async () => {
    resetPasswordForEmail.mockResolvedValue({
      error: { message: "Error sending recovery email" },
    });
    generateLink.mockResolvedValue({
      data: {
        user: { id: "u1", user_metadata: { full_name: "Tolu" } },
        properties: { hashed_token: "rh" },
      },
      error: null,
    });
    sendAuthEmail.mockResolvedValue(true);
    const res = await forgotPasswordAction({ email: "tolu@example.com" });
    expect(res).toEqual({ ok: true });
    expect(sendAuthEmail.mock.calls[0][0].html).toContain(
      "type=recovery&amp;next=%2Freset-password"
    );
  });

  it("answers the same for an email with no account", async () => {
    resetPasswordForEmail.mockResolvedValue({
      error: { message: "Error sending recovery email" },
    });
    generateLink.mockResolvedValue({
      data: null,
      error: { code: "user_not_found", status: 404, message: "User not found" },
    });
    const res = await forgotPasswordAction({ email: "nobody@example.com" });
    expect(res).toEqual({ ok: true });
    expect(sendAuthEmail).not.toHaveBeenCalled();
  });
});
