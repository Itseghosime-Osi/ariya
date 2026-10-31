"use server";

import { render } from "@react-email/components";
import { clientEnv } from "@/lib/env/client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAuthEmail } from "@/lib/email/auth-mail";
import { checkRateLimit, getClientIpHmac } from "@/lib/rate-limit";
import { AuthLinkEmail } from "@/emails/AuthLinkEmail";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { mapError } from "@/lib/errors";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpInput,
} from "./schemas";

export type ActionResult<T = void> =
  { ok: true; data?: T; redirectTo?: string } | { ok: false; error: string };

export async function signInAction(input: SignInInput): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message ?? "Invalid sign-in input";
    return { ok: false, error: firstError };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: mapError(error, "Failed to sign in") };
  }

  const redirectTo = safeRedirectPath(parsed.data.next, "/events");
  return { ok: true, redirectTo };
}

export async function signUpAction(
  input: SignUpInput
): Promise<ActionResult<{ hasSession: boolean }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message ?? "Invalid registration input";
    return { ok: false, error: firstError };
  }

  const { email, password, fullName, role } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
      emailRedirectTo: `${clientEnv.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (!error) {
    return { ok: true, data: { hasSession: Boolean(data.session) } };
  }
  if (!isMailerFailure(error)) {
    return { ok: false, error: mapError(error, "Failed to create account") };
  }

  // Supabase could not send the confirmation email (its built-in mailer only delivers to the
  // project's own team, a few an hour). Send it through the app's own provider instead.
  if (!(await underMailLimit("signup"))) {
    return {
      ok: false,
      error: "Too many sign-up attempts. Please wait a while and try again.",
    };
  }
  const admin = createAdminClient();
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });

  if (linkError) {
    // Already registered: answer as if it worked, so the form never reveals who has an account.
    if (
      linkError.code === "email_exists" ||
      /already (been )?registered/i.test(linkError.message)
    ) {
      return { ok: true, data: { hasSession: false } };
    }
    return {
      ok: false,
      error: mapError(linkError, "Failed to create account"),
    };
  }

  const sent = await sendAuthEmail({
    to: email,
    subject: "Confirm your email for Àríyá",
    html: await render(
      AuthLinkEmail({
        kind: "confirm",
        name: fullName,
        url: authLink(linkData.properties.hashed_token, "signup", "/events"),
      })
    ),
  });

  if (!sent) {
    // No email could go out at all: rather than strand them, confirm the account and sign them in.
    await admin.auth.admin.updateUserById(linkData.user.id, {
      email_confirm: true,
    });
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { ok: true, data: { hasSession: !signInError } };
  }

  return { ok: true, data: { hasSession: false } };
}

/** Supabase's own mailer failed or hit its hourly cap, rather than anything wrong with the input. */
function isMailerFailure(error: { code?: string; message: string }) {
  return (
    error.code === "over_email_send_rate_limit" ||
    /error sending .*email|email rate limit/i.test(error.message)
  );
}

/** Account emails sent through the app's own provider are capped per visitor. */
async function underMailLimit(kind: "signup" | "reset") {
  const limit = await checkRateLimit(
    `auth:${kind}:${await getClientIpHmac()}`,
    5,
    "1 hour"
  );
  return limit.success;
}

/** A link to /auth/confirm that signs the person in with a one-time token, then sends them on. */
function authLink(
  tokenHash: string,
  type: "signup" | "recovery",
  next: string
) {
  const url = new URL("/auth/confirm", clientEnv.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("next", next);
  return url.toString();
}

export async function forgotPasswordAction(
  input: ForgotPasswordInput
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message ?? "Invalid email address";
    return { ok: false, error: firstError };
  }

  const supabase = await createClient();
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${clientEnv.NEXT_PUBLIC_APP_URL}/reset-password` }
  );
  if (!resetError) return { ok: true };
  if (!isMailerFailure(resetError)) {
    return {
      ok: false,
      error: mapError(resetError, "Failed to send reset link"),
    };
  }

  // Supabase could not send it: send the reset link through the app's own provider instead.
  if (!(await underMailLimit("reset"))) {
    return {
      ok: false,
      error: "Too many reset requests. Please wait a while and try again.",
    };
  }
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: parsed.data.email,
  });

  // No account with that email: say the same as when there is one, so the form reveals nothing.
  if (error) {
    if (error.code === "user_not_found" || error.status === 404)
      return { ok: true };
    return { ok: false, error: mapError(error, "Failed to send reset link") };
  }

  const link = authLink(
    data.properties.hashed_token,
    "recovery",
    "/reset-password"
  );
  const sent = await sendAuthEmail({
    to: parsed.data.email,
    subject: "Reset your Àríyá passcode",
    html: await render(
      AuthLinkEmail({
        kind: "reset",
        name:
          (data.user.user_metadata?.full_name as string | undefined) ?? null,
        url: link,
      })
    ),
  });

  if (!sent) {
    return {
      ok: false,
      error:
        "We could not send the reset email just now. Please try again in a few minutes.",
    };
  }

  return { ok: true };
}

export async function resetPasswordAction(
  input: ResetPasswordInput
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message ?? "Invalid password reset input";
    return { ok: false, error: firstError };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: mapError(error, "Failed to update password") };
  }

  return { ok: true };
}

export async function signOutAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { ok: false, error: mapError(error, "Failed to sign out") };
  }

  return { ok: true };
}
