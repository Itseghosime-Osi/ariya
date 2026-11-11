import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hallLayoutSchema } from "@/features/seating/schemas";
import { writeHallLayout } from "@/features/seating/hall-save";

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
  // The studio sends `{ layout, baseRev }`; an older page sends the bare layout.
  const wrapped =
    body && typeof body === "object" && "layout" in (body as object)
      ? (body as { layout: unknown; baseRev?: unknown })
      : { layout: body, baseRev: undefined };
  const parsed = hallLayoutSchema.safeParse(wrapped.layout);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid layout" }, { status: 400 });
  }
  const baseRev =
    typeof wrapped.baseRev === "number" ? wrapped.baseRev : undefined;

  const res = await writeHallLayout(supabase, eventId, parsed.data, baseRev);
  if (!res.ok) {
    if (res.conflict) {
      return NextResponse.json(
        { conflict: true, rev: res.rev },
        { status: 409 }
      );
    }
    if (res.missing) {
      return NextResponse.json({ fallback: true }, { status: 200 });
    }
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rev: res.rev });
}
