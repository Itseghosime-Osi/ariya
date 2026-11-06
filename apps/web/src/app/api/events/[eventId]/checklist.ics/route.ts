import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChecklistData } from "@/features/checklist/queries";
import { buildChecklistIcs, icsFilename } from "@/features/checklist/ics";

/**
 * The checklist as a calendar file (6.4.3).
 *
 * The session client, not the admin one: the RLS policies on `tasks` decide what a person may
 * export, so a host exporting their own celebration needs no special case here, and a stranger
 * with a guessed event id gets nothing.
 */
export async function GET(
  _request: Request,
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

  const data = await getChecklistData(eventId);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = buildChecklistIcs(data.tasks, {
    calendarName: data.event.title,
    now: new Date(),
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFilename(data.event.title)}"`,
      // A checklist changes as the host works; a cached copy would be yesterday's plan.
      "Cache-Control": "private, no-store",
    },
  });
}
