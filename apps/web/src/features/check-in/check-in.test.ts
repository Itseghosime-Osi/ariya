import { describe, expect, it } from "vitest";
import { checkInInputSchema } from "./schemas";

describe("Check-In Domain & Schemas", () => {
  it("validates check-in input correctly", () => {
    const valid = checkInInputSchema.safeParse({
      code: "ARY-49F8-K2MN",
      count: 2,
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.count).toBe(2);
    }

    const defaultCount = checkInInputSchema.safeParse({
      code: "ARY-49F8-K2MN",
    });
    expect(defaultCount.success).toBe(true);
    if (defaultCount.success) {
      expect(defaultCount.data.count).toBe(1);
    }

    const emptyCode = checkInInputSchema.safeParse({
      code: "   ",
      count: 1,
    });
    expect(emptyCode.success).toBe(false);

    const negativeCount = checkInInputSchema.safeParse({
      code: "ARY-49F8-K2MN",
      count: 0,
    });
    expect(negativeCount.success).toBe(false);
  });
});
