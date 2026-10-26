"use server";

import { clientEnv } from "@/lib/env/client";
import { createClient } from "@/lib/supabase/server";
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
  { ok: true; data?: T } | { ok: false; error: string };

export async function signInAction(input: SignInInput): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    const firstError =
      parsed.error.errors[0]?.message ?? "Invalid sign-in input";
    return { ok: false, error: firstError };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function signUpAction(input: SignUpInput): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    const firstError =
      parsed.error.errors[0]?.message ?? "Invalid registration input";
    return { ok: false, error: firstError };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        role: parsed.data.role,
      },
      emailRedirectTo: `${clientEnv.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function forgotPasswordAction(
  input: ForgotPasswordInput
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const firstError =
      parsed.error.errors[0]?.message ?? "Invalid email address";
    return { ok: false, error: firstError };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${clientEnv.NEXT_PUBLIC_APP_URL}/reset-password`,
    }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function resetPasswordAction(
  input: ResetPasswordInput
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const firstError =
      parsed.error.errors[0]?.message ?? "Invalid password reset input";
    return { ok: false, error: firstError };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function signOutAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
