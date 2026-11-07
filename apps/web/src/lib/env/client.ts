import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().min(1),
  // App notifications are switched off until this is set.
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  // "Continue with Google" appears only when this is "true", after the provider is enabled in Supabase.
  NEXT_PUBLIC_GOOGLE_SIGN_IN: z.string().optional(),
});

const isSkip = process.env.SKIP_ENV_VALIDATION === "1";

const rawData = isSkip
  ? {
      NEXT_PUBLIC_APP_URL:
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        "https://placeholder-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
      NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:
        process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_placeholder",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY:
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined,
      NEXT_PUBLIC_GOOGLE_SIGN_IN:
        process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN || undefined,
    }
  : {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:
        process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY:
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined,
      NEXT_PUBLIC_GOOGLE_SIGN_IN:
        process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN || undefined,
    };

export const clientEnv = clientEnvSchema.parse(rawData);
