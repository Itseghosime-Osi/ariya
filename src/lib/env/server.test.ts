import { describe, it, expect } from "vitest";
import { serverEnvSchema, resolveServerEnv } from "./server";

describe("Server Env Validation & Schema", () => {
  const validBaseEnv = {
    NODE_ENV: "development",
    SUPABASE_SERVICE_ROLE_KEY: "valid-service-role-key",
    PAYSTACK_SECRET_KEY: "sk_test_1234567890",
    PAYSTACK_API_BASE: "https://api.paystack.co",
    EMAIL_TRANSPORT: "mailpit",
    MAILPIT_URL: "http://127.0.0.1:57324",
    RESEND_API_KEY: "re_sample_key",
    RESEND_FROM_EMAIL: "noreply@ariya.app",
    RATE_LIMIT_SECRET: "a-secret-rate-limit-token-with-minimum-32-chars",
    CRON_SECRET: "super-secure-cron-key",
  };

  it("requires RATE_LIMIT_SECRET with at least 32 characters and no default", () => {
    // Missing RATE_LIMIT_SECRET
    const { RATE_LIMIT_SECRET: _discard, ...withoutSecret } = validBaseEnv;
    const resMissing = serverEnvSchema.safeParse(withoutSecret);
    expect(resMissing.success).toBe(false);
    if (!resMissing.success) {
      expect(resMissing.error.issues[0].message).toMatch(/RATE_LIMIT_SECRET/);
    }

    // Too short (< 32 chars)
    const resShort = serverEnvSchema.safeParse({
      ...validBaseEnv,
      RATE_LIMIT_SECRET: "only-20-chars-here!",
    });
    expect(resShort.success).toBe(false);
    if (!resShort.success) {
      expect(resShort.error.issues[0].message).toContain(
        "at least 32 characters"
      );
    }

    // Valid (>= 32 chars)
    const resValid = serverEnvSchema.safeParse(validBaseEnv);
    expect(resValid.success).toBe(true);
  });

  it("enforces production rules when NODE_ENV is production", () => {
    // Mailpit rejected in production
    const prodMailpit = serverEnvSchema.safeParse({
      ...validBaseEnv,
      NODE_ENV: "production",
      EMAIL_TRANSPORT: "mailpit",
      RESEND_API_KEY: "re_real_key_123456",
    });
    expect(prodMailpit.success).toBe(false);

    // Placeholder Resend key rejected in production
    const prodPlaceholder = serverEnvSchema.safeParse({
      ...validBaseEnv,
      NODE_ENV: "production",
      EMAIL_TRANSPORT: "resend",
      RESEND_API_KEY: "re_placeholder",
    });
    expect(prodPlaceholder.success).toBe(false);

    // Valid production config accepted
    const prodValid = serverEnvSchema.safeParse({
      ...validBaseEnv,
      NODE_ENV: "production",
      EMAIL_TRANSPORT: "resend",
      RESEND_API_KEY: "re_live_production_secret_key",
    });
    expect(prodValid.success).toBe(true);
  });

  describe("resolveServerEnv with SKIP_ENV_VALIDATION", () => {
    it("allows SKIP_ENV_VALIDATION only during phase-production-build", () => {
      // Incomplete env (e.g. missing RATE_LIMIT_SECRET)
      const incompleteEnv = {
        NODE_ENV: "production",
      };

      const buildEnv = resolveServerEnv(incompleteEnv, {
        nextPhase: "phase-production-build",
        skipEnvValidation: "1",
      });

      expect(buildEnv).toBeDefined();
      expect(buildEnv.RATE_LIMIT_SECRET).toBeDefined();
      expect(buildEnv.RATE_LIMIT_SECRET.length).toBeGreaterThanOrEqual(32);
    });

    it("ignores SKIP_ENV_VALIDATION at runtime and throws on invalid schema", () => {
      const incompleteEnv = {
        NODE_ENV: "production",
      };

      // At runtime, nextPhase is not phase-production-build (e.g. undefined or development)
      expect(() =>
        resolveServerEnv(incompleteEnv, {
          nextPhase: undefined,
          skipEnvValidation: "1",
        })
      ).toThrow();

      // At runtime in production, invalid email transport throws even with SKIP_ENV_VALIDATION
      expect(() =>
        resolveServerEnv(
          {
            ...validBaseEnv,
            NODE_ENV: "production",
            EMAIL_TRANSPORT: "mailpit",
          },
          {
            nextPhase: "phase-development-server",
            skipEnvValidation: "1",
          }
        )
      ).toThrow();
    });
  });
});
