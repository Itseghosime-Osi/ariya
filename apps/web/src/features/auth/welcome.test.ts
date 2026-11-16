import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const getUserById = vi.fn();
const updateUserById = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { getUserById, updateUserById } },
  }),
}));
const sendAuthEmail = vi.fn(async () => true);
vi.mock("@/lib/email/auth-mail", () => ({
  sendAuthEmail: (...args: unknown[]) => sendAuthEmail(...(args as [])),
}));

import { sendWelcomeEmailOnce, WELCOME_SENT_KEY } from "./welcome";

const user = {
  id: "u1",
  email: "ada@example.com",
  user_metadata: { full_name: "Ada Obi" },
};

beforeEach(() => {
  getUserById.mockReset();
  updateUserById.mockReset();
  sendAuthEmail.mockClear();
  updateUserById.mockResolvedValue({ error: null });
});

describe("sendWelcomeEmailOnce", () => {
  it("marks the account, then sends the welcome", async () => {
    getUserById.mockResolvedValue({ data: { user } });
    await sendWelcomeEmailOnce(user);
    expect(updateUserById).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        user_metadata: expect.objectContaining({
          full_name: "Ada Obi",
          [WELCOME_SENT_KEY]: expect.any(String),
        }),
      })
    );
    expect(sendAuthEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ada@example.com",
        subject: "Welcome to Àríyá, Ada ✦",
      })
    );
  });

  it("never sends twice", async () => {
    getUserById.mockResolvedValue({
      data: {
        user: {
          ...user,
          user_metadata: { [WELCOME_SENT_KEY]: "2026-11-16T00:00:00Z" },
        },
      },
    });
    await sendWelcomeEmailOnce(user);
    expect(sendAuthEmail).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("does not send when it cannot mark the account", async () => {
    getUserById.mockResolvedValue({ data: { user } });
    updateUserById.mockResolvedValue({ error: new Error("down") });
    await sendWelcomeEmailOnce(user);
    expect(sendAuthEmail).not.toHaveBeenCalled();
  });

  it("never throws", async () => {
    getUserById.mockRejectedValue(new Error("network"));
    await expect(sendWelcomeEmailOnce(user)).resolves.toBeUndefined();
    await expect(sendWelcomeEmailOnce(null)).resolves.toBeUndefined();
  });
});
