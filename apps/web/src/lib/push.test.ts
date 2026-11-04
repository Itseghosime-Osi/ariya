import { beforeEach, describe, expect, it, vi } from "vitest";

const sendNotification = vi.fn();
const setVapidDetails = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("web-push", () => ({
  default: { sendNotification, setVapidDetails },
}));
vi.mock("@/lib/env/client", () => ({
  clientEnv: {
    NEXT_PUBLIC_APP_URL: "https://ariya.test",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: "pub",
  },
}));
vi.mock("@/lib/env/server", () => ({
  serverEnv: { VAPID_PRIVATE_KEY: "priv" },
}));

const deleted: string[][] = [];
const touched: string[][] = [];
const subs = [
  { id: "s1", endpoint: "https://push.test/1", p256dh: "k", auth: "a" },
  { id: "s2", endpoint: "https://push.test/2", p256dh: "k", auth: "a" },
];
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "event_members") {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({
                data: [{ user_id: "host" }, { user_id: "host" }],
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({ in: async () => ({ data: subs }) }),
        delete: () => ({
          in: async (_c: string, ids: string[]) => {
            deleted.push(ids);
            return {};
          },
        }),
        update: () => ({
          in: async (_c: string, ids: string[]) => {
            touched.push(ids);
            return {};
          },
        }),
      };
    },
  }),
}));

const { sendPushToUsers, sendPushToEventHosts } = await import("./push");
const msg = { title: "Hi", body: "There", url: "/events" };

describe("app notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleted.length = 0;
    touched.length = 0;
  });

  it("sends to every device and records when it was last used", async () => {
    sendNotification.mockResolvedValue({});
    const res = await sendPushToUsers(["host"], msg);
    expect(res.sent).toBe(2);
    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(JSON.parse(sendNotification.mock.calls[0][1])).toEqual(msg);
    expect(touched).toEqual([["s1", "s2"]]);
  });

  it("forgets devices the push service says are gone", async () => {
    sendNotification
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(
        Object.assign(new Error("gone"), { statusCode: 410 })
      );
    const res = await sendPushToUsers(["host"], msg);
    expect(res.sent).toBe(1);
    expect(deleted).toEqual([["s2"]]);
  });

  it("keeps a device after a passing failure", async () => {
    sendNotification.mockRejectedValue(
      Object.assign(new Error("busy"), { statusCode: 503 })
    );
    const res = await sendPushToUsers(["host"], msg);
    expect(res.sent).toBe(0);
    expect(deleted).toEqual([]);
  });

  it("reaches a celebration's hosts", async () => {
    sendNotification.mockResolvedValue({});
    const res = await sendPushToEventHosts("event-1", msg);
    expect(res.sent).toBe(2);
  });

  it("does nothing for nobody", async () => {
    expect((await sendPushToUsers([], msg)).sent).toBe(0);
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
