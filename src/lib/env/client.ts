import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().min(1),
});

const isSkip = process.env.SKIP_ENV_VALIDATION === "1";

const parsed = isSkip
  ? clientEnvSchema.safeParse({
      NEXT_PUBLIC_APP_URL:
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        "https://placeholder-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
      NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:
        process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_placeholder",
    })
  : clientEnvSchema.safeParse({
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:
        process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    });

if (!parsed.success) {
  console.error(
    "❌ Invalid client environment variables:",
    parsed.error.flatten().fieldErrors
  );
  throw new Error("Invalid client environment variables");
}

export const clientEnv = parsed.data;
