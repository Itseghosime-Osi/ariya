import { describe, it, expect } from "vitest";
import { initializePaymentSchema } from "./schemas";

describe("Billing schemas and calculations", () => {
  it("validates event ID for payment initialization", () => {
    const res = initializePaymentSchema.safeParse({
      eventId: "c0000000-0000-0000-0000-000000000001",
    });
    expect(res.success).toBe(true);

    const invalid = initializePaymentSchema.safeParse({
      eventId: "not-a-uuid",
    });
    expect(invalid.success).toBe(false);
  });
});
