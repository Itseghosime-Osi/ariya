"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { pushConfigured, sendPushToUsers } from "@/lib/push";
import { pushSubscriptionSchema, type PushSubscriptionInput } from "./schemas";

export type NotificationActionResult =
  { ok: true } | { ok: false; error: string };

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Remembers this device so the signed-in host's notifications reach it. */
export async function savePushSubscriptionAction(
  input: PushSubscriptionInput
): Promise<NotificationActionResult> {
  if (!pushConfigured()) {
    return { ok: false, error: "App notifications are not set up yet." };
  }
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Please sign in again." };

  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "This device could not be registered." };
  }

  const userAgent = ((await headers()).get("user-agent") ?? "").slice(0, 512);
  const admin = createAdminClient();
  // A device belongs to whoever turned notifications on last.
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: userAgent || null,
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    return { ok: false, error: "Could not turn on notifications. Try again." };
  }
  return { ok: true };
}

/** Forgets this device, so it gets no more notifications. */
export async function removePushSubscriptionAction(
  endpoint: string
): Promise<NotificationActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Please sign in again." };
  if (typeof endpoint !== "string" || endpoint.length > 2048) {
    return { ok: false, error: "Unknown device." };
  }
  const admin = createAdminClient();
  await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", userId);
  return { ok: true };
}

/** Sends a sample notification to the signed-in host's devices. */
export async function sendTestNotificationAction(): Promise<NotificationActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Please sign in again." };

  const limit = await checkRateLimit(`push:test:${userId}`, 5, "10 minutes");
  if (!limit.success) {
    return { ok: false, error: "That's a few tests already. Try again soon." };
  }

  const { sent } = await sendPushToUsers([userId], {
    title: "Notifications are on 🎉",
    body: "This is how Àríyá will tell you when a guest replies.",
    url: "/profile",
    tag: "test",
  });
  if (sent === 0) {
    return {
      ok: false,
      error: "No notification could be delivered. Turn them off and on again.",
    };
  }
  return { ok: true };
}
