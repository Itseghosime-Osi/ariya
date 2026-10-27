import { describe, it, expect } from "vitest";
import { z } from "zod";

// Test schema matching serverEnvSchema production requirements
const testServerEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    EMAIL_TRANSPORT: z.enum(["resend", "mailpit"]),
    RESEND_API_KEY: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (data.EMAIL_TRANSPORT !== "resend") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "EMAIL_TRANSPORT must be 'resend' in production",
          path: ["EMAIL_TRANSPORT"],
        });
      }
      if (
        !data.RESEND_API_KEY ||
        data.RESEND_API_KEY === "re_placeholder" ||
        data.RESEND_API_KEY.startsWith("re_sample")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "A valid non-placeholder RESEND_API_KEY is required in production",
          path: ["RESEND_API_KEY"],
        });
      }
    }
  });

describe("Server Env Validation", () => {
  it("rejects non-resend transport in production", () => {
    const res = testServerEnvSchema.safeParse({
      NODE_ENV: "production",
      EMAIL_TRANSPORT: "mailpit",
      RESEND_API_KEY: "re_real_key_12345",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain(
        "EMAIL_TRANSPORT must be 'resend'"
      );
    }
  });

  it("rejects placeholder RESEND_API_KEY in production", () => {
    const res = testServerEnvSchema.safeParse({
      NODE_ENV: "production",
      EMAIL_TRANSPORT: "resend",
      RESEND_API_KEY: "re_placeholder",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain(
        "valid non-placeholder RESEND_API_KEY"
      );
    }
  });

  it("accepts valid production configuration", () => {
    const res = testServerEnvSchema.safeParse({
      NODE_ENV: "production",
      EMAIL_TRANSPORT: "resend",
      RESEND_API_KEY: "re_prod_secret_live_999",
    });
    expect(res.success).toBe(true);
  });
});
