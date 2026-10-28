import { describe, it, expect } from "vitest";
import { generateToken } from "./tokens";

describe("generateToken", () => {
  it("generates tokens of default length 22 (>= 131 bits)", () => {
    const token = generateToken();
    expect(token).toHaveLength(22);
  });

  it("supports custom length >= 22", () => {
    const token = generateToken(32);
    expect(token).toHaveLength(32);
  });

  it("throws error if length < 22", () => {
    expect(() => generateToken(21)).toThrow(
      "Token length must be at least 22 characters"
    );
  });

  it("contains only valid Base62 characters", () => {
    const token = generateToken();
    expect(/^[0-9A-Za-z]+$/.test(token)).toBe(true);
  });

  it("generates unique tokens", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateToken());
    }
    expect(tokens.size).toBe(100);
  });

  it("passes basic uniformity distribution check across Base62 alphabet", () => {
    const counts: Record<string, number> = {};
    const sampleSize = 1000;
    const tokenLength = 22;

    for (let i = 0; i < sampleSize; i++) {
      const token = generateToken(tokenLength);
      for (const char of token) {
        counts[char] = (counts[char] || 0) + 1;
      }
    }

    // With 1000 tokens * 22 chars = 22,000 characters across 62 bins
    // Expected frequency per character ~ 354
    // Verify that every single Base62 character appears and has reasonable representation
    const uniqueChars = Object.keys(counts);
    expect(uniqueChars.length).toBe(62);

    for (const char of uniqueChars) {
      expect(counts[char]).toBeGreaterThan(150);
      expect(counts[char]).toBeLessThan(600);
    }
  });
});
