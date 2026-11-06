import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hallLayoutSchema } from "@/features/seating/schemas";

/**
 * The last write of a studio visit (build checklist 7.5).
 *
 * Saving a layout is normally a server action on a short pause. Leaving the studio the moment a
 * change lands cancels that pause, and an in-app link click does not fire `pagehide`, so the
 * action is torn down before it reaches the database. The studio therefore sends that final
 * document here with `keepalive`, which the browser finishes after the page has gone.
 *
 * The session client, not the admin one: the RLS policies on `events` decide who may write a
 * hall, so a host saving their own celebration needs no special case here.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS refuses a stranger's write by matching no row, which reads as success here. Say no plainly.
  const { data: member } = await supabase.rpc("is_event_member", {
    p_event_id: eventId,
  });
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = hallLayoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid layout" }, { status: 400 });
  }

  const { error } = await supabase
    .from("events")
    .update({ hall_layout: parsed.data })
    .eq("id", eventId);

  if (error) {
    if (
      error.code === "42703" ||
      error.code === "PGRST204" ||
      /hall_layout/.test(error.message ?? "")
    ) {
      return NextResponse.json({ fallback: true }, { status: 200 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
