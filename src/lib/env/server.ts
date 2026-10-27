import "server-only";
import { z } from "zod";

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    PAYSTACK_SECRET_KEY: z.string().min(1),
    EMAIL_TRANSPORT: z.enum(["resend", "mailpit"]).default("mailpit"),
    MAILPIT_URL: z.string().url().default("http://127.0.0.1:57324"),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.string().email(),
    RATE_LIMIT_SECRET: z
      .string()
      .min(16)
      .default("super-secret-rate-limit-salt-key-minimum-16"),
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

const isSkip = process.env.SKIP_ENV_VALIDATION === "1";

const rawServerData = {
  NODE_ENV: process.env.NODE_ENV,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  EMAIL_TRANSPORT: process.env.EMAIL_TRANSPORT,
  MAILPIT_URL: process.env.MAILPIT_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  RATE_LIMIT_SECRET: process.env.RATE_LIMIT_SECRET,
  CRON_SECRET: process.env.CRON_SECRET,
};

export const serverEnv = isSkip
  ? ({
      NODE_ENV:
        (process.env.NODE_ENV as "development" | "test" | "production") ||
        "development",
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key",
      PAYSTACK_SECRET_KEY:
        process.env.PAYSTACK_SECRET_KEY || "sk_test_placeholder",
      EMAIL_TRANSPORT:
        (process.env.EMAIL_TRANSPORT as "resend" | "mailpit") || "mailpit",
      MAILPIT_URL: process.env.MAILPIT_URL || "http://127.0.0.1:57324",
      RESEND_API_KEY: process.env.RESEND_API_KEY || "re_mocked_for_build",
      RESEND_FROM_EMAIL:
        process.env.RESEND_FROM_EMAIL || "rsvps@owambeplan.com",
      RATE_LIMIT_SECRET:
        process.env.RATE_LIMIT_SECRET ||
        "super-secret-rate-limit-salt-key-minimum-16",
      CRON_SECRET: process.env.CRON_SECRET || "cron_placeholder",
    } as z.infer<typeof serverEnvSchema>)
  : serverEnvSchema.parse(rawServerData);
