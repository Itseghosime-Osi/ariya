import "server-only";
import { z } from "zod";

export const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    PAYSTACK_SECRET_KEY: z.string().min(1),
    PAYSTACK_API_BASE: z.string().url().default("https://api.paystack.co"),
    EMAIL_TRANSPORT: z.enum(["resend", "mailpit"]).default("mailpit"),
    MAILPIT_URL: z.string().url().default("http://127.0.0.1:57324"),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.string().email(),
    RATE_LIMIT_SECRET: z
      .string({
        required_error: "RATE_LIMIT_SECRET is required",
      })
      .min(32, "RATE_LIMIT_SECRET must be at least 32 characters"),
    CRON_SECRET: z.string().min(1),
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

export function resolveServerEnv(
  rawEnv: Record<string, string | undefined>,
  options?: { nextPhase?: string; skipEnvValidation?: string }
): z.infer<typeof serverEnvSchema> {
  const nextPhase = options?.nextPhase ?? process.env.NEXT_PHASE;
  const skipEnvVal =
    options?.skipEnvValidation ?? process.env.SKIP_ENV_VALIDATION;

  // Allow SKIP_ENV_VALIDATION only during the production build phase
  const isBuildPhase = nextPhase === "phase-production-build";
  const shouldSkip = isBuildPhase && skipEnvVal === "1";

  if (shouldSkip) {
    return {
      NODE_ENV:
        (rawEnv.NODE_ENV as "development" | "test" | "production") ||
        "development",
      SUPABASE_SERVICE_ROLE_KEY:
        rawEnv.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key",
      PAYSTACK_SECRET_KEY: rawEnv.PAYSTACK_SECRET_KEY || "sk_test_placeholder",
      PAYSTACK_API_BASE: rawEnv.PAYSTACK_API_BASE || "https://api.paystack.co",
      EMAIL_TRANSPORT:
        (rawEnv.EMAIL_TRANSPORT as "resend" | "mailpit") || "mailpit",
      MAILPIT_URL: rawEnv.MAILPIT_URL || "http://127.0.0.1:57324",
      RESEND_API_KEY: rawEnv.RESEND_API_KEY || "re_mocked_for_build",
      RESEND_FROM_EMAIL: rawEnv.RESEND_FROM_EMAIL || "rsvps@owambeplan.com",
      RATE_LIMIT_SECRET:
        rawEnv.RATE_LIMIT_SECRET ||
        "super-secret-rate-limit-salt-key-minimum-32-chars-long",
      CRON_SECRET: rawEnv.CRON_SECRET || "cron_placeholder",
    };
  }

  return serverEnvSchema.parse(rawEnv);
}

export const serverEnv = resolveServerEnv(process.env);
