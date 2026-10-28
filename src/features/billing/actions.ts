"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";
import { mapError } from "@/lib/errors";
import { CELEBRATION_PASS_AMOUNT_KOBO } from "@/lib/paystack";
import { initializePaymentSchema } from "./schemas";

export async function initializePaymentAction(eventId: string): Promise<{
  error?: string;
}> {
  const parsed = initializePaymentSchema.safeParse({ eventId });
  if (!parsed.success) {
    return { error: "Invalid celebration event ID" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { error: "You must be signed in with a valid email to upgrade" };
  }

  // Check event role: must be owner or planner
  const { data: member } = await supabase
    .from("event_members")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || (member.role !== "owner" && member.role !== "planner")) {
    return { error: "Only celebration owners and planners may manage billing" };
  }

  // Generate unique Paystack payment reference with crypto.randomUUID()
  const reference = crypto.randomUUID();

  // Insert pending payment record via admin client
  const adminSupabase = createAdminClient();
  const { error: insertErr } = await adminSupabase.from("payments").insert({
    event_id: eventId,
    user_id: user.id,
    paystack_reference: reference,
    amount_kobo: CELEBRATION_PASS_AMOUNT_KOBO,
    status: "pending",
  });

  if (insertErr) {
    return { error: mapError(insertErr) };
  }

  // Initialize payment on Paystack
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const callbackUrl = `${appUrl}/events/${eventId}/billing/callback`;

  let authorizationUrl: string;

  try {
    const initRes = await fetch(
      `${serverEnv.PAYSTACK_API_BASE.replace(/\/$/, "")}/transaction/initialize`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serverEnv.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: CELEBRATION_PASS_AMOUNT_KOBO,
          email: user.email,
          reference,
          callback_url: callbackUrl,
        }),
        cache: "no-store",
      }
    );

    if (!initRes.ok) {
      const errBody = await initRes.json().catch(() => ({}));
      return {
        error:
          typeof errBody?.message === "string"
            ? errBody.message
            : "Failed to initialize payment with Paystack",
      };
    }

    const initData = (await initRes.json()) as {
      status: boolean;
      message?: string;
      data?: {
        authorization_url: string;
        access_code: string;
        reference: string;
      };
    };

    if (!initData.status || !initData.data?.authorization_url) {
      return { error: "Payment gateway did not provide an authorization URL" };
    }

    authorizationUrl = initData.data.authorization_url;
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Network error connecting to payment gateway",
    };
  }

  redirect(authorizationUrl);
}
