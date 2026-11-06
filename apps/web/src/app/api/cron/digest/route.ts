import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";
import { isQuiet } from "@/features/notifications/quiet-hours";
import { sendPushToUsers } from "@/lib/push";

/**
 * The weekly checklist digest (6.4.2).
 *
 * Weekly is the default, so this sends to everyone who has not turned it off — a person with no
 * `notification_preferences` row is on, not absent. Quiet hours are honoured by holding the send,
 * not by dropping it: the cron runs hourly and a host inside their window is picked up on the first
 * run after it ends.
 *
 * One digest per person per week, enforced by `digest_log`'s primary key, so an hourly cron cannot
 * send the same week twice even if two runs overlap.
 */

function verifyCronSecret(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const tokenBuf = Buffer.from(authHeader.slice(7));
  const secretBuf = Buffer.from(secret);
  if (tokenBuf.length !== secretBuf.length) return false;
  return crypto.timingSafeEqual(tokenBuf, secretBuf);
}

/** The Monday of the week a date falls in, as YYYY-MM-DD. */
export function weekStart(now: Date): string {
  const day = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  // getUTCDay is 0 for Sunday, which belongs to the week that started six days earlier.
  const offset = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - offset);
  return day.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!verifyCronSecret(authHeader, serverEnv.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const week = weekStart(now);
  const weekEnd = new Date(`${week}T00:00:00Z`);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("user_id, digest, quiet_from, quiet_to");
  const preferences = new Map(
    (prefs ?? []).map((p) => [p.user_id, p] as const)
  );

  const { data: events } = await admin
    .from("events")
    .select("id, title")
    .eq("status", "active");
  const titleOf = new Map((events ?? []).map((e) => [e.id, e.title] as const));

  const { data: members } = await admin
    .from("event_members")
    .select("user_id, event_id")
    .in("role", ["owner", "planner", "couple"]);
  if (!members?.length) {
    return NextResponse.json({ success: true, sent: 0 });
  }

  const { data: tasks } = await admin
    .from("tasks")
    .select("event_id, due_date")
    .eq("status", "todo")
    .is("deleted_at", null)
    .gte("due_date", week)
    .lt("due_date", weekEnd.toISOString());

  const thisWeek = new Map<string, number>();
  for (const task of tasks ?? []) {
    thisWeek.set(task.event_id, (thisWeek.get(task.event_id) ?? 0) + 1);
  }

  // One digest per person, covering every celebration they help with.
  const byUser = new Map<string, { count: number; firstEventId: string }>();
  for (const member of members) {
    const count = thisWeek.get(member.event_id) ?? 0;
    if (count === 0) continue;
    const existing = byUser.get(member.user_id);
    if (existing) existing.count += count;
    else byUser.set(member.user_id, { count, firstEventId: member.event_id });
  }
  if (byUser.size === 0) {
    return NextResponse.json({ success: true, sent: 0 });
  }

  // Whoever already has this week's row is done, whichever run put it there.
  const { data: alreadySent } = await admin
    .from("digest_log")
    .select("user_id")
    .eq("week_start", week);
  for (const row of alreadySent ?? []) byUser.delete(row.user_id);

  let sent = 0;
  for (const [userId, summary] of byUser) {
    const pref = preferences.get(userId);
    if (pref?.digest === "off") continue;
    if (isQuiet(nowMinutes, pref?.quiet_from, pref?.quiet_to)) continue;

    // Claiming the week before sending is what makes the guarantee hold: a second run's insert
    // loses on the primary key and moves on without a notification.
    const { error: claimError } = await admin
      .from("digest_log")
      .insert({ user_id: userId, week_start: week });
    if (claimError) continue;

    const title = titleOf.get(summary.firstEventId) ?? "your celebration";
    const { sent: delivered } = await sendPushToUsers([userId], {
      title: "This week's checklist",
      body:
        summary.count === 1
          ? `One task is due this week for ${title}.`
          : `${summary.count} tasks are due this week for ${title}.`,
      url: `/events/${summary.firstEventId}/checklist`,
      tag: "digest",
    });

    if (delivered > 0) {
      sent++;
    } else {
      // Nothing reached a device — no subscription, or every one is stale. Release the claim so a
      // later run in the same week can try again once the host turns notifications on.
      await admin
        .from("digest_log")
        .delete()
        .eq("user_id", userId)
        .eq("week_start", week);
    }
  }

  return NextResponse.json({ success: true, sent });
}
