import { describe, expect, it } from "vitest";
import { pushSubscriptionSchema } from "./schemas";

describe("push subscription input", () => {
  const keys = { p256dh: "BNc", auth: "tB" };
  it("accepts a browser subscription", () => {
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: "https://fcm.googleapis.com/fcm/send/abc",
        keys,
      }).success
    ).toBe(true);
  });
  it("refuses a non-https endpoint", () => {
    expect(
      pushSubscriptionSchema.safeParse({ endpoint: "http://evil.test/x", keys })
        .success
    ).toBe(false);
  });
  it("refuses missing keys", () => {
    expect(
      pushSubscriptionSchema.safeParse({ endpoint: "https://push.test/x" })
        .success
    ).toBe(false);
  });
});
