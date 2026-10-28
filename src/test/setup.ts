import "@testing-library/jest-dom";

Object.assign(process.env, {
  NODE_ENV: "test",
});
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:57321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mocked-anon-key";
process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = "pk_test_mocked";

process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.PAYSTACK_SECRET_KEY = "sk_test_mocked_for_test_environment";
process.env.PAYSTACK_API_BASE = "https://api.paystack.co";
process.env.EMAIL_TRANSPORT = "mailpit";
process.env.MAILPIT_URL = "http://127.0.0.1:57324";
process.env.RESEND_API_KEY = "re_test_mocked_key";
process.env.RESEND_FROM_EMAIL = "rsvps@ariya-two.vercel.app";
process.env.RATE_LIMIT_SECRET = "test_rate_limit_secret_32_characters_long_min";
process.env.CRON_SECRET = "test_cron_secret";
