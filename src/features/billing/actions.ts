"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapError } from "@/lib/errors";
import { CELEBRATION_PASS_AMOUNT_KOBO } from "@/lib/paystack";
import { initializePaymentSchema } from "./schemas";

export async function initializePaymentAction(eventId: string): Promise<{
  success?: boolean;
  error?: string;
  reference?: string;
  amountKobo?: number;
}> {
  const parsed = initializePaymentSchema.safeParse({ eventId });
  if (!parsed.success) {
    return { error: "Invalid celebration event ID" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to upgrade" };
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

  // Generate unique Paystack payment reference
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const reference = `ARY-PAY-${eventId.slice(0, 8).toUpperCase()}-${Date.now()}-${randomSuffix}`;

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

  revalidatePath(`/events/${eventId}/billing`);
  return {
    success: true,
    reference,
    amountKobo: CELEBRATION_PASS_AMOUNT_KOBO,
  };
}
