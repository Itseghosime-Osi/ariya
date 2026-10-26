import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PAYSTACK_SECRET_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
  CRON_SECRET: z.string().min(1),
});

const isSkip = process.env.SKIP_ENV_VALIDATION === "1";

const parsed = isSkip
  ? serverEnvSchema.safeParse({
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key",
      PAYSTACK_SECRET_KEY:
        process.env.PAYSTACK_SECRET_KEY || "sk_test_placeholder",
      RESEND_API_KEY: process.env.RESEND_API_KEY || "re_placeholder",
      RESEND_FROM_EMAIL:
        process.env.RESEND_FROM_EMAIL || "rsvps@owambeplan.com",
      CRON_SECRET: process.env.CRON_SECRET || "cron_placeholder",
    })
  : serverEnvSchema.safeParse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      CRON_SECRET: process.env.CRON_SECRET,
    });

if (!parsed.success) {
  console.error(
    "❌ Invalid server environment variables:",
    parsed.error.flatten().fieldErrors
  );
  throw new Error("Invalid server environment variables");
}

export const serverEnv = parsed.data;
