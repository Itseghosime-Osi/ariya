import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";
import { dispatchRsvpEmail } from "@/lib/email/dispatcher";

function verifyCronSecret(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.slice(7);
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(secret);

  if (tokenBuf.length !== secretBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(tokenBuf, secretBuf);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!verifyCronSecret(authHeader, serverEnv.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 1. Query active events within the next 14 days
  const now = new Date();
  const in14Days = new Date(
    now.getTime() + 14 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: events, error: eventErr } = await supabase
    .from("events")
    .select("id, title, couple, date, venue")
    .eq("status", "active")
    .gte("date", now.toISOString())
    .lte("date", in14Days);

  if (eventErr || !events || events.length === 0) {
    return NextResponse.json({
      success: true,
      dispatchedCount: 0,
      message: "No upcoming events found",
    });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let totalDispatched = 0;

  for (const event of events) {
    // 2. Query guests with pending RSVP and email
    const { data: guests } = await supabase
      .from("guests")
      .select("id, name, email, rsvp_token, rsvps (status)")
      .eq("event_id", event.id)
      .not("email", "is", null);

    if (!guests) continue;

    const pendingGuests = guests.filter((g) => {
      const rsvp = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
      return (rsvp?.status ?? "pending") === "pending";
    });

    for (const guest of pendingGuests) {
      if (!guest.email) continue;

      // 3. Idempotency & Email Cap check: check if any email was sent to this guest in the last 24h
      const { count: recentCount } = await supabase
        .from("email_log")
        .select("id", { count: "exact", head: true })
        .eq("guest_id", guest.id)
        .gte("sent_at", oneDayAgo);

      if (recentCount && recentCount > 0) {
        // Already reminded or emailed within 24 hours (idempotent)
        continue;
      }

      const rsvpUrl = `${origin}/i/${guest.rsvp_token}`;
      const emailRes = await dispatchRsvpEmail({
        eventId: event.id,
        guestId: guest.id,
        recipientEmail: guest.email,
        subject: `Gentle Reminder: Celebration of ${event.couple}`,
        templateType: "reminder",
        html: `<p>Hello ${guest.name},</p><p>We are looking forward to celebrating the union of ${event.couple}.</p><p>Date: ${event.date}<br/>Venue: ${event.venue}</p><p><a href="${rsvpUrl}">Please confirm your attendance here</a></p>`,
      });

      if (emailRes.success) {
        totalDispatched++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    dispatchedCount: totalDispatched,
  });
}
