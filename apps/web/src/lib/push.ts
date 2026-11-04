import "server-only";
import webpush from "web-push";
import { clientEnv } from "@/lib/env/client";
import { serverEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PushMessage {
  title: string;
  body: string;
  /** A path in the app to open when the notification is tapped. */
  url: string;
  /** Notifications with the same tag replace each other instead of piling up. */
  tag?: string;
}

/** App notifications work once both VAPID keys are set. */
export function pushConfigured(): boolean {
  return Boolean(
    clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY && serverEnv.VAPID_PRIVATE_KEY
  );
}

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    clientEnv.NEXT_PUBLIC_APP_URL,
    clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    serverEnv.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

/**
 * Sends a notification to every device these people have turned notifications on for. Devices the
 * push service says are gone (unsubscribed, app removed) are forgotten. Never throws.
 */
export async function sendPushToUsers(
  userIds: string[],
  message: PushMessage
): Promise<{ sent: number }> {
  if (!pushConfigured() || userIds.length === 0) return { sent: 0 };
  try {
    configure();
    const admin = createAdminClient();
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", [...new Set(userIds)]);
    if (!subs?.length) return { sent: 0 };

    const payload = JSON.stringify(message);
    const gone: string[] = [];
    const delivered: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { TTL: 60 * 60 * 24, urgency: "normal" }
          );
          delivered.push(s.id);
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) gone.push(s.id);
        }
      })
    );
    if (gone.length) {
      await admin.from("push_subscriptions").delete().in("id", gone);
    }
    if (delivered.length) {
      await admin
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .in("id", delivered);
    }
    return { sent: delivered.length };
  } catch (err) {
    console.error(
      "Push send failed:",
      err instanceof Error ? err.constructor.name : "UnknownError"
    );
    return { sent: 0 };
  }
}

/** Notifies the owners and planners of a celebration. */
export async function sendPushToEventHosts(
  eventId: string,
  message: PushMessage
): Promise<{ sent: number }> {
  if (!pushConfigured()) return { sent: 0 };
  try {
    const admin = createAdminClient();
    const { data: members } = await admin
      .from("event_members")
      .select("user_id")
      .eq("event_id", eventId)
      .in("role", ["owner", "planner", "couple"]);
    return sendPushToUsers(
      (members ?? []).map((m) => m.user_id),
      message
    );
  } catch {
    return { sent: 0 };
  }
}
