"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";
import {
  createPaystackRefund,
  verifyPaystackTransaction,
} from "@/lib/paystack";
import { confirmPayment } from "@/features/billing/confirm-payment";
import { adminForAction } from "./guard";

/**
 * Admin actions. Each one: checks the caller is an admin who passed two-step sign-in, takes a
 * written reason, does the work, and is written to the admin log (inside the database function
 * where the work is in the database, here where it goes through the Auth or Paystack APIs).
 */

export type AdminResult =
  { ok: true; message: string } | { ok: false; error: string };

const NOT_ALLOWED: AdminResult = {
  ok: false,
  error: "You are not signed in to the admin desk. Reload the page.",
};

const id = z.string().uuid();
const reason = z
  .string()
  .trim()
  .min(3, "Write a short reason (it goes in the admin log).")
  .max(500);

/** Database errors carry a readable message for the cases we raise ourselves. */
function readable(error: { message?: string } | null, fallback: string) {
  const msg = error?.message ?? "";
  return msg && !/permission denied|violates|syntax/i.test(msg)
    ? msg
    : fallback;
}

async function log(
  adminId: string,
  action: string,
  targetType: "account" | "event" | "payment" | "ai_connection" | "guest_list",
  targetId: string,
  label: string | null,
  why: string | null,
  details: Record<string, unknown> = {}
) {
  await createAdminClient().rpc("admin_log", {
    p_admin: adminId,
    p_action: action,
    p_target_type: targetType,
    p_target_id: targetId,
    p_target_label: label ?? "",
    p_reason: why ?? "",
    p_details: details as never,
  });
}

// ---------------------------------------------------------------------------
// Celebrations
// ---------------------------------------------------------------------------

export async function grantCompPassAction(
  eventId: string,
  why: string
): Promise<AdminResult> {
  const admin = await adminForAction();
  if (!admin) return NOT_ALLOWED;
  const parsed = z
    .object({ eventId: id, why: reason })
    .safeParse({ eventId, why });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };

  const { data, error } = await createAdminClient().rpc(
    "admin_grant_comp_pass",
    {
      p_event: eventId,
      p_admin: admin.userId,
      p_reason: parsed.data.why,
    }
  );
  if (error)
    return { ok: false, error: readable(error, "Could not grant the pass.") };
  revalidatePath(`/admin/events/${eventId}`);
  const ref = (data as { reference?: string } | null)?.reference ?? "";
  return { ok: true, message: `Complimentary pass granted (${ref}).` };
}

export async function deleteEventAction(
  eventId: string,
  why: string,
  typedTitle: string
): Promise<AdminResult> {
  const admin = await adminForAction();
  if (!admin) return NOT_ALLOWED;
  const parsed = z
    .object({ eventId: id, why: reason })
    .safeParse({ eventId, why });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };

  const client = createAdminClient();
  const { data: event } = await client
    .from("events")
    .select("title")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { ok: false, error: "That celebration no longer exists." };
  if (typedTitle.trim() !== event.title.trim()) {
    return {
      ok: false,
      error: "Type the celebration's name exactly to confirm.",
    };
  }

  const { error } = await client.rpc("admin_delete_event", {
    p_event: eventId,
    p_admin: admin.userId,
    p_reason: parsed.data.why,
  });
  if (error)
    return {
      ok: false,
      error: readable(error, "Could not delete the celebration."),
    };
  revalidatePath("/admin/events");
  return { ok: true, message: `"${event.title}" was deleted.` };
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export async function signOutEverywhereAction(
  userId: string,
  why: string
): Promise<AdminResult> {
  const admin = await adminForAction();
  if (!admin) return NOT_ALLOWED;
  const parsed = z
    .object({ userId: id, why: reason })
    .safeParse({ userId, why });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };

  const { data, error } = await createAdminClient().rpc("admin_end_sessions", {
    p_user: userId,
    p_admin: admin.userId,
    p_reason: parsed.data.why,
  });
  if (error)
    return {
      ok: false,
      error: readable(error, "Could not sign the account out."),
    };
  revalidatePath(`/admin/accounts/${userId}`);
  return {
    ok: true,
    message: `Signed out of ${data ?? 0} session(s). Pages already open stop working within the hour.`,
  };
}

/** About a hundred years: Supabase has no "forever", and this reads as suspended until restored. */
const SUSPEND_FOR = "876000h";

export async function suspendAccountAction(
  userId: string,
  why: string
): Promise<AdminResult> {
  const admin = await adminForAction();
  if (!admin) return NOT_ALLOWED;
  const parsed = z
    .object({ userId: id, why: reason })
    .safeParse({ userId, why });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  if (userId === admin.userId) {
    return { ok: false, error: "You cannot suspend your own account." };
  }

  const client = createAdminClient();
  const { data: isAdmin } = await client.rpc("is_platform_admin", {
    p_user: userId,
  });
  if (isAdmin === true) {
    return {
      ok: false,
      error: "Remove this person as an admin before suspending them.",
    };
  }
  const { data: target, error } = await client.auth.admin.updateUserById(
    userId,
    {
      ban_duration: SUSPEND_FOR,
    }
  );
  if (error) return { ok: false, error: "Could not suspend the account." };

  // A suspended account must not keep a session it already has.
  await client.rpc("admin_end_sessions", {
    p_user: userId,
    p_admin: admin.userId,
    p_reason: `Suspended: ${parsed.data.why}`,
  });
  await log(
    admin.userId,
    "suspend_account",
    "account",
    userId,
    target.user?.email ?? null,
    parsed.data.why
  );
  revalidatePath(`/admin/accounts/${userId}`);
  return { ok: true, message: "Account suspended and signed out everywhere." };
}

export async function restoreAccountAction(
  userId: string,
  why: string
): Promise<AdminResult> {
  const admin = await adminForAction();
  if (!admin) return NOT_ALLOWED;
  const parsed = z
    .object({ userId: id, why: reason })
    .safeParse({ userId, why });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };

  const { data: target, error } =
    await createAdminClient().auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });
  if (error) return { ok: false, error: "Could not restore the account." };
  await log(
    admin.userId,
    "restore_account",
    "account",
    userId,
    target.user?.email ?? null,
    parsed.data.why
  );
  revalidatePath(`/admin/accounts/${userId}`);
  return { ok: true, message: "Account restored. They can sign in again." };
}

export async function deleteAccountAction(
  userId: string,
  why: string,
  typedEmail: string
): Promise<AdminResult> {
  const admin = await adminForAction();
  if (!admin) return NOT_ALLOWED;
  const parsed = z
    .object({ userId: id, why: reason })
    .safeParse({ userId, why });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };

  const client = createAdminClient();
  const { data: profile } = await client
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return { ok: false, error: "That account no longer exists." };
  if (typedEmail.trim().toLowerCase() !== profile.email.trim().toLowerCase()) {
    return { ok: false, error: "Type the account's email exactly to confirm." };
  }

  const { data, error } = await client.rpc("admin_prepare_account_deletion", {
    p_user: userId,
    p_admin: admin.userId,
    p_reason: parsed.data.why,
  });
  if (error)
    return {
      ok: false,
      error: readable(error, "Could not delete the account."),
    };

  const { error: authError } = await client.auth.admin.deleteUser(userId);
  if (authError) {
    return {
      ok: false,
      error:
        "Their celebrations were removed, but the sign-in account could not be deleted. Try again.",
    };
  }
  revalidatePath("/admin/accounts");
  const removed =
    (data as { celebrations_deleted?: number } | null)?.celebrations_deleted ??
    0;
  return {
    ok: true,
    message: `${profile.email} was deleted, with ${removed} celebration(s) only they owned.`,
  };
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function recheckPaymentAction(
  paymentId: string
): Promise<AdminResult> {
  const admin = await adminForAction();
  if (!admin) return NOT_ALLOWED;
  if (!id.safeParse(paymentId).success)
    return { ok: false, error: "Unknown payment." };

  const client = createAdminClient();
  const { data: payment } = await client
    .from("payments")
    .select("paystack_reference, status, event_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return { ok: false, error: "That payment no longer exists." };
  if (payment.paystack_reference.startsWith("COMP-")) {
    return {
      ok: false,
      error: "A complimentary pass has nothing to check with Paystack.",
    };
  }

  const verify = await verifyPaystackTransaction(
    payment.paystack_reference,
    serverEnv.PAYSTACK_SECRET_KEY,
    serverEnv.PAYSTACK_API_BASE
  );
  const paystackStatus =
    verify.data?.status ?? (verify.status ? "unknown" : "unreachable");

  let outcome = `Paystack says: ${paystackStatus}.`;
  if (
    verify.status &&
    verify.data?.status === "success" &&
    payment.status !== "success"
  ) {
    const confirmed = await confirmPayment(payment.paystack_reference, verify);
    outcome = confirmed.success
      ? "Paystack confirmed it. The payment is recorded and the celebration is unlocked."
      : `Paystack says it succeeded, but it could not be recorded: ${confirmed.error ?? "unknown error"}.`;
  } else if (verify.data?.status === "failed" && payment.status === "pending") {
    await client
      .from("payments")
      .update({ status: "failed" })
      .eq("id", paymentId);
    outcome = "Paystack says it failed. Marked as failed.";
  }

  await log(
    admin.userId,
    "recheck_payment",
    "payment",
    paymentId,
    payment.paystack_reference,
    null,
    {
      paystack_status: paystackStatus,
      before: payment.status,
    }
  );
  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${paymentId}`);
  return { ok: true, message: outcome };
}

export async function refundPaymentAction(
  paymentId: string,
  why: string,
  typedReference: string
): Promise<AdminResult> {
  const admin = await adminForAction();
  if (!admin) return NOT_ALLOWED;
  const parsed = z
    .object({ paymentId: id, why: reason })
    .safeParse({ paymentId, why });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };

  const client = createAdminClient();
  const { data: payment } = await client
    .from("payments")
    .select("paystack_reference, status, amount_kobo")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return { ok: false, error: "That payment no longer exists." };
  if (typedReference.trim() !== payment.paystack_reference) {
    return {
      ok: false,
      error: "Type the payment reference exactly to confirm.",
    };
  }
  if (payment.status !== "success") {
    return { ok: false, error: "Only a successful payment can be refunded." };
  }

  // A complimentary pass took no money, so there is nothing to send back: it is only withdrawn.
  let provider: Record<string, unknown> = { complimentary: true };
  if (
    payment.amount_kobo > 0 &&
    !payment.paystack_reference.startsWith("COMP-")
  ) {
    const refund = await createPaystackRefund(
      payment.paystack_reference,
      serverEnv.PAYSTACK_SECRET_KEY,
      serverEnv.PAYSTACK_API_BASE
    );
    if (!refund.status) {
      return {
        ok: false,
        error: `Paystack did not accept the refund: ${refund.message}. Nothing was changed.`,
      };
    }
    provider = {
      paystack_refund_id: refund.data?.id ?? null,
      paystack_status: refund.data?.status ?? null,
      amount: refund.data?.amount ?? null,
    };
  }

  const { data, error } = await client.rpc("admin_record_refund", {
    p_payment: paymentId,
    p_admin: admin.userId,
    p_reason: parsed.data.why,
    p_provider: provider as never,
  });
  if (error) {
    return {
      ok: false,
      error:
        "Paystack accepted the refund, but it could not be recorded here. Do not refund again; record it by hand and tell the developer.",
    };
  }
  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${paymentId}`);
  const removed = (data as { pass_removed?: boolean } | null)?.pass_removed;
  return {
    ok: true,
    message: removed
      ? "Refunded. The celebration no longer has a pass."
      : "Refunded. Another payment still covers the celebration's pass.",
  };
}

// ---------------------------------------------------------------------------
// AI connections and guest lists
// ---------------------------------------------------------------------------

export async function disconnectAiAppAction(
  consentId: string,
  why: string
): Promise<AdminResult> {
  const admin = await adminForAction();
  if (!admin) return NOT_ALLOWED;
  const parsed = z
    .object({ consentId: id, why: reason })
    .safeParse({ consentId, why });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await createAdminClient().rpc(
    "admin_revoke_ai_connection",
    {
      p_consent: consentId,
      p_admin: admin.userId,
      p_reason: parsed.data.why,
    }
  );
  if (error)
    return {
      ok: false,
      error: readable(error, "Could not disconnect the app."),
    };
  revalidatePath("/admin/ai");
  return { ok: true, message: "Disconnected. Its next call will be refused." };
}

/** Called by the guest-list page when an admin opens it, so every view of guests' details is logged. */
export async function recordGuestListView(
  eventId: string,
  title: string,
  why: string
) {
  const admin = await adminForAction();
  if (!admin) return;
  await log(admin.userId, "view_guest_list", "guest_list", eventId, title, why);
}
