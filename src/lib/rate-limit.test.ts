import { describe, it, expect } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows requests within the limit", () => {
    const key = `test_key_${Date.now()}`;
    const res1 = checkRateLimit(key, 3, 1000);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit(key, 3, 1000);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = checkRateLimit(key, 3, 1000);
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("blocks requests that exceed the limit", () => {
    const key = `test_block_${Date.now()}`;
    checkRateLimit(key, 2, 5000);
    checkRateLimit(key, 2, 5000);

    const res = checkRateLimit(key, 2, 5000);
    expect(res.success).toBe(false);
    expect(res.remaining).toBe(0);
    expect(res.retryAfter).toBeGreaterThan(0);
  });
});
