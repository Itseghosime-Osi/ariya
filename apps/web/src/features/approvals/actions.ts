"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { mapError } from "@/lib/errors";
import { sendGuestInvitationEmailAction } from "@/features/invitations/actions";
import { sendBatchReminderAction } from "@/features/reminders/actions";
import { checkHallPlacement } from "@/features/seating/hall/checks";
import { normaliseLayout } from "@/features/seating/hall/model";
import {
  selectApplicableAssignments,
  type PlanGuest,
  type PlanTable,
} from "@/features/seating/plan-checks";
import {
  saveHallLayoutAction,
  saveTablePositionsAction,
  bulkAssignSeatsAction,
} from "@/features/seating/actions";
import {
  hallPayloadSchema,
  proposalIdSchema,
  proposalPayloadSchema,
  proposalSnapshotSchema,
  seatingPayloadSchema,
  type HallSnapshot,
  type SeatingSnapshot,
} from "./schemas";
import {
  APPROVALS_PATH,
  type ActionResult,
  type ApplyOutcome,
  type ProposalKind,
  type ProposalStatus,
  type RestoreOutcome,
} from "./types";

const SIGNED_OUT = "Sign in to approve a proposal.";
const UNIDENTIFIED = "That proposal could not be identified.";

/** A proposal never writes more than this into its result: a copy kept for undo has to stay small. */
const MAX_SNAPSHOT_BYTES = 96 * 1024;

/** How many problems a refusal lists before it says how many more there are. */
const MAX_REPORTED_PROBLEMS = 5;

interface ProposalRow {
  kind: string;
  event_id: string;
  payload: unknown;
}

interface RestorableRow extends ProposalRow {
  status: string;
  result: unknown;
}

/**
 * Approves a proposal and then carries it out, in that order and never the other way round: the
 * status change is what makes "approved once, applied once" true, so sending only ever happens to a
 * proposal that has just been won.
 *
 * Sending goes through the same actions the Invitations and Reminders pages use. Both re-check
 * quota and rate limits on their own, so this adds no second sending path.
 */
export async function approveProposalAction(
  id: string
): Promise<ActionResult<ApplyOutcome>> {
  const parsedId = proposalIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: UNIDENTIFIED };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SIGNED_OUT };

  const { data: decided, error: decideError } = await supabase.rpc(
    "decide_ai_proposal",
    { p_id: parsedId.data, p_decision: "approve" }
  );

  if (decideError) {
    revalidatePath(APPROVALS_PATH);
    return { ok: false, error: refusalMessage(decideError) };
  }

  // Expiry comes back as a value rather than an error, so the row stays honest about what happened.
  if (isRecord(decided) && decided.status === "expired") {
    revalidatePath(APPROVALS_PATH);
    return {
      ok: false,
      error:
        "That proposal expired before you decided it. Nothing was sent, and a fresh request will be needed.",
    };
  }

  const proposal = await loadProposal(parsedId.data);
  if (!proposal) {
    revalidatePath(APPROVALS_PATH);
    return { ok: false, error: "That proposal could not be read back." };
  }

  const kind = proposal.kind as ProposalKind;

  // The room and the seating are their own kind of work: re-validated against the celebration as it
  // stands, applied through the designer's own actions, and recorded with a copy of what was there.
  if (kind === "apply_hall_layout" || kind === "apply_seating_plan") {
    return kind === "apply_hall_layout"
      ? applyHallProposal(parsedId.data, proposal.event_id, proposal.payload)
      : applySeatingProposal(
          parsedId.data,
          proposal.event_id,
          proposal.payload
        );
  }

  const payload = proposalPayloadSchema.safeParse(proposal.payload);
  if (!payload.success) {
    return recordAndReport(
      parsedId.data,
      "failed",
      { reason: "The proposal's details were not in a form Àríyá can act on." },
      "This proposal's details were not in a form Àríyá can act on, so nothing was sent."
    );
  }

  try {
    const outcome =
      kind === "send_invitations"
        ? await applyInvitations(
            parsedId.data,
            proposal.event_id,
            payload.data.guestIds
          )
        : await applyReminders(
            parsedId.data,
            proposal.event_id,
            payload.data.guestIds,
            payload.data.note ?? null
          );

    revalidatePath(APPROVALS_PATH);
    revalidatePath("/connect-ai");
    return { ok: true, data: outcome };
  } catch (error) {
    return recordAndReport(
      parsedId.data,
      "failed",
      {
        reason:
          "Sending stopped unexpectedly. Some guests may already have been contacted.",
      },
      error instanceof Error && error.message
        ? error.message
        : "Sending stopped unexpectedly. Some guests may already have been contacted."
    );
  }
}

export async function rejectProposalAction(
  id: string
): Promise<ActionResult<{ proposalId: string }>> {
  const parsedId = proposalIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: UNIDENTIFIED };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SIGNED_OUT };

  const { error } = await supabase.rpc("decide_ai_proposal", {
    p_id: parsedId.data,
    p_decision: "reject",
  });

  revalidatePath(APPROVALS_PATH);

  if (error) return { ok: false, error: refusalMessage(error) };

  return { ok: true, data: { proposalId: parsedId.data } };
}

/**
 * Sends to the guests who still exist, still have an email and have not had an invitation. That
 * filter is what makes a retry safe: anyone already invited drops out rather than being emailed
 * twice.
 */
async function applyInvitations(
  proposalId: string,
  eventId: string,
  guestIds: string[]
): Promise<ApplyOutcome> {
  const supabase = await createClient();

  const { data: guests, error } = await supabase
    .from("guests")
    .select("id")
    .eq("event_id", eventId)
    .in("id", guestIds)
    .not("email", "is", null)
    .is("invited_at", null);

  if (error) {
    throw new Error(
      "Could not read the guests for this proposal. Nothing was sent."
    );
  }

  const totalCount = guestIds.length;
  const eligible = (guests ?? []).map((guest) => guest.id);

  if (eligible.length === 0) {
    return saveOutcome(proposalId, "applied", {
      sentCount: 0,
      skippedCount: totalCount,
      reason:
        "Everyone had already been invited, or no longer has an email address.",
      message: `Nothing was sent. Everyone in this proposal had already been invited, or no longer has an email address.`,
    });
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const guestId of eligible) {
    const result = await sendGuestInvitationEmailAction(eventId, guestId);
    if (result.success) sentCount++;
    else failedCount++;
  }

  const notSent = totalCount - sentCount;

  if (failedCount > 0) {
    return saveOutcome(proposalId, "failed", {
      sentCount,
      skippedCount: notSent,
      reason: `${failedCount} ${failedCount === 1 ? "invitation" : "invitations"} could not be sent.`,
      message: `Sent to ${sentCount} of ${totalCount} guests; ${notSent} were not sent — ask your app to propose again, guests already invited are skipped.`,
    });
  }

  return saveOutcome(proposalId, "applied", {
    sentCount,
    skippedCount: notSent,
    message:
      notSent > 0
        ? `Sent to ${sentCount} of ${totalCount} guests; ${notSent} had already been invited or had no email address.`
        : `Sent to all ${totalCount} guests.`,
  });
}

/** Reminders go through the batch action, so the 24-hour cap and quota stay exactly where they are. */
async function applyReminders(
  proposalId: string,
  eventId: string,
  guestIds: string[],
  note: string | null
): Promise<ApplyOutcome> {
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .maybeSingle();

  const subject = reminderSubject(event?.title ?? null);

  const form = new FormData();
  form.set("filter", "all");
  form.set("subject", subject);
  form.set("customMessage", note ?? "");
  for (const guestId of guestIds) form.append("guestIds", guestId);

  const result = await sendBatchReminderAction(eventId, form);

  if (result.error) {
    return saveOutcome(proposalId, "failed", {
      sentCount: 0,
      skippedCount: 0,
      reason: result.error,
      message: result.error,
    });
  }

  const sentCount = result.sentCount ?? 0;
  const skippedCount = result.skippedCount ?? 0;

  if (sentCount === 0) {
    return saveOutcome(proposalId, "failed", {
      sentCount,
      skippedCount,
      reason:
        "No reminders could be sent. Guests may have been emailed too recently.",
      message:
        "No reminders could be sent — everyone had been emailed within the last 24 hours, or had no email address.",
    });
  }

  return saveOutcome(proposalId, "applied", {
    sentCount,
    skippedCount,
    message:
      skippedCount > 0
        ? `${sentCount} reminders sent, ${skippedCount} skipped by the 24-hour email cap.`
        : `${sentCount} reminders sent.`,
  });
}

/**
 * Records how applying finished, then reports it. A proposal is only ever moved out of `approved`
 * here, which is what stops a second approve from sending anything again.
 */
async function recordOutcome(
  proposalId: string,
  status: "applied" | "failed",
  result: Record<string, unknown>,
  message: string
): Promise<ApplyOutcome> {
  const supabase = await createClient();

  await supabase.rpc("record_ai_proposal_result", {
    p_id: proposalId,
    p_status: status,
    p_result: result as unknown as Json,
  });

  return {
    proposalId,
    status: status as ProposalStatus,
    sentCount: countIn(result, "sentCount"),
    skippedCount: countIn(result, "skippedCount"),
    appliedCount: countIn(result, "appliedCount"),
    seatedCount: countIn(result, "seatedCount"),
    movedCount: countIn(result, "movedCount"),
    message,
  };
}

/** Sends keep their own small shape; everything else records its own counts through `recordOutcome`. */
async function saveOutcome(
  proposalId: string,
  status: "applied" | "failed",
  outcome: {
    sentCount: number;
    skippedCount: number;
    reason?: string;
    message: string;
  }
): Promise<ApplyOutcome> {
  return recordOutcome(
    proposalId,
    status,
    {
      sentCount: outcome.sentCount,
      skippedCount: outcome.skippedCount,
      ...(outcome.reason ? { reason: outcome.reason } : {}),
    },
    outcome.message
  );
}

async function recordAndReport(
  proposalId: string,
  status: "applied" | "failed",
  result: Record<string, unknown>,
  message: string
): Promise<ActionResult<ApplyOutcome>> {
  const saved = await recordOutcome(
    proposalId,
    status,
    { sentCount: 0, skippedCount: 0, ...result },
    message
  );

  revalidatePath(APPROVALS_PATH);
  return { ok: true, data: saved };
}

function countIn(result: Record<string, unknown>, key: string): number {
  const value = result[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

/**
 * Applies a proposed room through the designer's own two actions, and nothing else: the layout is
 * re-validated against the celebration as it stands now, tables that have been deleted since are
 * dropped, tables added since keep the position they already have, and the room the host has today
 * is copied into the result first so it can be put back.
 */
async function applyHallProposal(
  proposalId: string,
  eventId: string,
  stored: unknown
): Promise<ActionResult<ApplyOutcome>> {
  const payload = hallPayloadSchema.safeParse(stored);
  if (!payload.success) {
    return recordAndReport(
      proposalId,
      "failed",
      { reason: "The proposed room was not in a form Àríyá can act on." },
      "The proposed room was not in a form Àríyá can act on, so nothing in the hall was changed."
    );
  }

  const supabase = await createClient();
  const [event, tables] = await Promise.all([
    supabase
      .from("events")
      .select("hall_layout")
      .eq("id", eventId)
      .maybeSingle(),
    supabase
      .from("tables")
      .select("id, name, capacity, shape, position_x, position_y")
      .eq("event_id", eventId),
  ]);

  if (event.error || tables.error || !tables.data) {
    return recordAndReport(
      proposalId,
      "failed",
      { reason: "The hall could not be read just now." },
      "The hall could not be read just now, so nothing was changed. Ask your app to propose again."
    );
  }

  const currentLayout = normaliseLayout(event.data?.hall_layout ?? null);
  const positions = new Map(
    (payload.data.tablePositions ?? []).map((p) => [p.id, { x: p.x, y: p.y }])
  );
  const known = new Set(tables.data.map((table) => table.id));

  // A table deleted since the proposal was raised cannot be placed, and is dropped rather than
  // guessed at. A table added since keeps where it already stands.
  const dropped = [...positions.keys()].filter((id) => !known.has(id));
  const next = tables.data.map((table) => {
    const proposed = positions.get(table.id);
    return {
      id: table.id,
      x: proposed?.x ?? table.position_x,
      y: proposed?.y ?? table.position_y,
    };
  });

  const problems = checkHallPlacement({
    layout: payload.data.layout,
    tables: tables.data,
    positions: Object.fromEntries(
      next.map((position) => [position.id, { x: position.x, y: position.y }])
    ),
    rotations: payload.data.layout.rotations,
  });

  if (problems.length > 0) {
    return recordAndReport(
      proposalId,
      "failed",
      {
        reason: summarise(problems),
        appliedCount: 0,
        skippedCount: dropped.length,
      },
      `The room no longer fits what your hall has become, so nothing was changed. ${summarise(problems)}`
    );
  }

  const snapshot = hallSnapshot(currentLayout, tables.data);

  const savedLayout = await saveHallLayoutAction(eventId, payload.data.layout);
  if (!savedLayout.ok) {
    const reason = savedLayout.data?.fallback
      ? "This celebration's hall cannot be saved yet."
      : (savedLayout.error ?? "The room could not be saved.");
    return recordAndReport(
      proposalId,
      "failed",
      { reason, appliedCount: 0, skippedCount: 0 },
      `${reason} Nothing in the hall was changed.`
    );
  }

  const savedPositions = await saveTablePositionsAction(eventId, next);
  if (!savedPositions.ok) {
    return recordAndReport(
      proposalId,
      "failed",
      {
        reason:
          savedPositions.error ?? "The table positions could not be saved.",
        appliedCount: 0,
        skippedCount: next.length,
      },
      `The room was saved but the tables could not be moved: ${savedPositions.error ?? "the save failed"}. The room may now be part-applied.`
    );
  }

  revalidatePath(`/events/${eventId}/seating`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath(APPROVALS_PATH);

  const droppedNote =
    dropped.length > 0
      ? `; ${dropped.length} ${dropped.length === 1 ? "table" : "tables"} from the plan no longer exist, so ${dropped.length === 1 ? "it was" : "they were"} left alone`
      : "";

  const message = snapshot.snapshot
    ? `The room was applied to ${next.length} tables${droppedNote}. You can restore the previous room for 7 days.`
    : `The room was applied to ${next.length} tables${droppedNote}. ${snapshot.restoreUnavailable ?? ""}`;

  return {
    ok: true,
    data: await recordOutcome(
      proposalId,
      "applied",
      {
        appliedCount: next.length,
        skippedCount: dropped.length,
        tableCount: next.length,
        snapshot: snapshot.snapshot,
        ...(snapshot.restoreUnavailable
          ? { restoreUnavailable: snapshot.restoreUnavailable }
          : {}),
      },
      message
    ),
  };
}

/**
 * A copy of the room as it is before the change, or an honest reason there is none. Kept small
 * because it lives in the proposal's own row, next to the counts the card already shows.
 */
function hallSnapshot(
  layout: ReturnType<typeof normaliseLayout>,
  tables: { id: string; position_x: number; position_y: number }[]
): { snapshot: HallSnapshot | null; restoreUnavailable?: string } {
  const snapshot: HallSnapshot = {
    kind: "hall",
    layout,
    tablePositions: tables.map((table) => ({
      id: table.id,
      x: table.position_x,
      y: table.position_y,
    })),
  };

  const bytes = new TextEncoder().encode(JSON.stringify(snapshot)).length;
  if (bytes > MAX_SNAPSHOT_BYTES) {
    return {
      snapshot: null,
      restoreUnavailable:
        "The room you had before is too large to keep a copy of here, so it cannot be restored from this card.",
    };
  }

  return { snapshot };
}

/**
 * Applies a proposed seating plan through the one action the desk already uses. What still fits is
 * seated and what no longer does is dropped and counted, so a host is told exactly what happened
 * rather than being given a plan that only half worked with no explanation.
 */
async function applySeatingProposal(
  proposalId: string,
  eventId: string,
  stored: unknown
): Promise<ActionResult<ApplyOutcome>> {
  const payload = seatingPayloadSchema.safeParse(stored);
  if (!payload.success) {
    return recordAndReport(
      proposalId,
      "failed",
      {
        reason: "The proposed seating plan was not in a form Àríyá can act on.",
      },
      "The proposed seating plan was not in a form Àríyá can act on, so nobody was moved."
    );
  }

  const [guests, tables] = await Promise.all([
    loadGuests(eventId),
    loadPlanTables(eventId),
  ]);

  if (!guests || !tables) {
    return recordAndReport(
      proposalId,
      "failed",
      { reason: "The seating could not be read just now." },
      "The seating could not be read just now, so nobody was moved. Ask your app to propose again."
    );
  }

  const mode = payload.data.mode ?? "fill_unseated";
  const { applicable, skipped, unchanged } = selectApplicableAssignments({
    assignments: payload.data.assignments,
    guests,
    tables,
    mode,
  });

  const guestById = new Map(guests.map((guest) => [guest.id, guest]));
  const moved = applicable.filter((assignment) => {
    const guest = guestById.get(assignment.guestId);
    return guest?.tableId !== null && guest?.tableId !== undefined;
  }).length;

  if (applicable.length === 0) {
    return {
      ok: true,
      data: await recordOutcome(
        proposalId,
        "applied",
        {
          seatedCount: 0,
          movedCount: 0,
          skippedCount: skipped.length,
          snapshot: {
            kind: "seating",
            assignments: [],
          } satisfies SeatingSnapshot,
          reason:
            skipped.length > 0
              ? summarise(skipped.map((entry) => describeSkip(entry)))
              : "Everyone named was already seated where the plan wanted them.",
        },
        "Nobody was moved: the plan no longer changes anything in this celebration."
      ),
    };
  }

  // Taken before anything is written, so it says where every affected guest actually sat.
  const before: SeatingSnapshot = {
    kind: "seating",
    assignments: applicable.map((assignment) => ({
      guestId: assignment.guestId,
      tableId: guestById.get(assignment.guestId)?.tableId ?? null,
    })),
  };

  const applied = await bulkAssignSeatsAction(
    eventId,
    applicable.map((assignment) => ({
      guestId: assignment.guestId,
      tableId: assignment.tableId,
    }))
  );

  const seated = applied.data?.seated ?? 0;
  const refused = applied.data?.failed ?? [];

  if (!applied.ok && seated === 0) {
    return recordAndReport(
      proposalId,
      "failed",
      {
        reason: applied.error ?? "The seating could not be saved.",
        seatedCount: 0,
        movedCount: 0,
        skippedCount: skipped.length + applicable.length,
      },
      `${applied.error ?? "The seating could not be saved."} Nobody was moved.`
    );
  }

  revalidatePath(`/events/${eventId}/seating`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath(APPROVALS_PATH);

  const notApplied = skipped.length + refused.length;
  const counted =
    seated === applicable.length
      ? `${seated} ${seated === 1 ? "guest was" : "guests were"} seated`
      : `${seated} of ${applicable.length} guests were seated`;

  return {
    ok: true,
    data: await recordOutcome(
      proposalId,
      refused.length > 0 ? "failed" : "applied",
      {
        seatedCount: seated,
        movedCount: moved,
        skippedCount: notApplied,
        snapshot: before,
        ...(notApplied > 0
          ? { reason: skipReason(skipped, refused.length, unchanged.length) }
          : {}),
      },
      notApplied > 0
        ? `${counted}; ${notApplied} could not be, and ${unchanged.length} were already where the plan wanted them.`
        : `${counted}${moved > 0 ? `, ${moved} moved from another table` : ""}. You can undo this for 7 days.`
    ),
  };
}

function skipReason(
  skipped: { reason: string }[],
  refused: number,
  unchanged: number
): string {
  const reasons = skipped
    .slice(0, MAX_REPORTED_PROBLEMS)
    .map((entry) => entry.reason);
  const more = skipped.length - reasons.length;
  return [
    ...reasons,
    ...(more > 0 ? [`and ${more} more`] : []),
    ...(refused > 0 ? [`${refused} refused by the seating desk`] : []),
    ...(unchanged > 0
      ? [`${unchanged} already seated where the plan wanted them`]
      : []),
  ].join("; ");
}

function describeSkip(entry: {
  guestName: string | null;
  guestId: string;
  reason: string;
}): string {
  const who = entry.guestName ?? `Guest ${entry.guestId}`;
  return `“${who}”: ${entry.reason}`;
}

/** The first few reasons, then how many more, in the shape both a host and an app can read. */
function summarise(problems: string[]): string {
  const shown = problems.slice(0, MAX_REPORTED_PROBLEMS);
  const rest = problems.length - shown.length;
  return [...shown, ...(rest > 0 ? [`and ${rest} more`] : [])].join("; ");
}

async function loadPlanTables(eventId: string): Promise<PlanTable[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tables")
    .select("id, name, capacity")
    .eq("event_id", eventId);

  if (error) return null;
  return data ?? [];
}

async function loadGuests(eventId: string): Promise<PlanGuest[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guests")
    .select("id, name, party_size, seat_assignments ( table_id )")
    .eq("event_id", eventId);

  if (error) return null;

  return (data ?? []).map((guest) => {
    const seat = Array.isArray(guest.seat_assignments)
      ? guest.seat_assignments[0]
      : guest.seat_assignments;

    return {
      id: guest.id,
      name: guest.name,
      partySize: guest.party_size ?? 1,
      tableId: seat?.table_id ?? null,
    };
  });
}

/**
 * Puts the previous room or seating back. Everything is re-validated exactly as it was on the way
 * in, through the same actions, and the row records that it was restored — which is what makes a
 * second restore impossible.
 */
export async function restoreProposalAction(
  id: string
): Promise<ActionResult<RestoreOutcome>> {
  const parsedId = proposalIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: UNIDENTIFIED };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SIGNED_OUT };

  const { data, error } = await supabase
    .from("ai_proposals")
    .select("kind, event_id, payload, status, result")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "That proposal could not be read back." };
  }

  const row = data as RestorableRow;
  if (row.status !== "applied") {
    return {
      ok: false,
      error: "Only a change that was applied can be restored.",
    };
  }

  const stored = row.result as {
    snapshot?: unknown;
    restoredAt?: unknown;
  } | null;
  if (stored && typeof stored.restoredAt === "string") {
    return { ok: false, error: "That change was already restored." };
  }

  const snapshot = proposalSnapshotSchema.safeParse(stored?.snapshot);
  if (!snapshot.success) {
    return {
      ok: false,
      error:
        "This change kept no copy of what was there before, so it cannot be restored from here.",
    };
  }

  const restored =
    snapshot.data.kind === "hall"
      ? await restoreHall(row.event_id, snapshot.data)
      : await restoreSeating(row.event_id, snapshot.data);

  if (!restored.ok) return restored;

  const { error: recordError } = await supabase.rpc(
    "restore_ai_proposal_result",
    {
      p_id: parsedId.data,
      p_result: {
        ...(stored ?? {}),
        restoredAt: new Date().toISOString(),
        restoredCount: restored.data.restoredCount,
      } as unknown as Json,
    }
  );

  revalidatePath(APPROVALS_PATH);
  revalidatePath(`/events/${row.event_id}/seating`);

  if (recordError) {
    return {
      ok: false,
      error:
        recordError.hint === "NOT_RESTORABLE"
          ? "That change was already restored, so nothing more was put back."
          : mapError(
              recordError,
              "The change was put back, but could not be marked as restored."
            ),
    };
  }

  return {
    ok: true,
    data: {
      proposalId: parsedId.data,
      message: restored.data.message,
      restoredCount: restored.data.restoredCount,
    },
  };
}

async function restoreHall(
  eventId: string,
  snapshot: HallSnapshot
): Promise<ActionResult<{ message: string; restoredCount: number }>> {
  const supabase = await createClient();
  const { data: tables, error } = await supabase
    .from("tables")
    .select("id, name, capacity, shape")
    .eq("event_id", eventId);

  if (error || !tables) {
    return {
      ok: false,
      error: "The hall could not be read just now, so nothing was restored.",
    };
  }

  const known = new Set(tables.map((table) => table.id));
  const positions = snapshot.tablePositions.filter((p) => known.has(p.id));

  // With no saved room there is nothing to put the tables back against, so only they return.
  if (snapshot.layout) {
    const problems = checkHallPlacement({
      layout: snapshot.layout,
      tables,
      positions: Object.fromEntries(
        positions.map((p) => [p.id, { x: p.x, y: p.y }])
      ),
      rotations: snapshot.layout.rotations,
    });

    if (problems.length > 0) {
      return {
        ok: false,
        error: `The previous room no longer fits this hall, so nothing was restored. ${summarise(problems)}`,
      };
    }

    const saved = await saveHallLayoutAction(eventId, snapshot.layout);
    if (!saved.ok) {
      return {
        ok: false,
        error: `${saved.error ?? "The previous room could not be saved."} Nothing was restored.`,
      };
    }
  }

  if (positions.length > 0) {
    const saved = await saveTablePositionsAction(eventId, positions);
    if (!saved.ok) {
      return {
        ok: false,
        error: `${saved.error ?? "The table positions could not be put back."} The room may be part-restored.`,
      };
    }
  }

  return {
    ok: true,
    data: {
      message: `The previous room is back: ${positions.length} ${positions.length === 1 ? "table" : "tables"} in the places they stood before.`,
      restoredCount: positions.length,
    },
  };
}

async function restoreSeating(
  eventId: string,
  snapshot: SeatingSnapshot
): Promise<ActionResult<{ message: string; restoredCount: number }>> {
  const guests = await loadGuests(eventId);
  if (!guests) {
    return {
      ok: false,
      error:
        "The guest list could not be read just now, so nothing was restored.",
    };
  }

  const known = new Set(guests.map((guest) => guest.id));
  const pairs = snapshot.assignments
    .filter((entry) => known.has(entry.guestId))
    .map((entry) => ({ guestId: entry.guestId, tableId: entry.tableId }));

  if (pairs.length === 0) {
    return {
      ok: false,
      error:
        "None of the guests this change touched are still on the celebration, so there is nothing to restore.",
    };
  }

  const applied = await bulkAssignSeatsAction(eventId, pairs);
  const restored = applied.data?.seated ?? 0;

  if (!applied.ok && restored === 0) {
    return {
      ok: false,
      error: `${applied.error ?? "The seating could not be put back."} Nothing was restored.`,
    };
  }

  const left = pairs.length - restored;
  return {
    ok: true,
    data: {
      message:
        left > 0
          ? `${restored} of ${pairs.length} guests are back where they sat before; ${left} could not be, because their table has been removed or filled.`
          : `${restored} ${restored === 1 ? "guest is" : "guests are"} back where they sat before.`,
      restoredCount: restored,
    },
  };
}

async function loadProposal(id: string): Promise<ProposalRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_proposals")
    .select("kind, event_id, payload")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

function reminderSubject(eventTitle: string | null): string {
  if (!eventTitle) return "A gentle reminder about your celebration";
  const subject = `A gentle reminder about ${eventTitle}`;
  return subject.length <= 150 ? subject : `${subject.slice(0, 149)}…`;
}

/** The two RPC refusals worth spelling out; anything else goes through the shared mapper. */
function refusalMessage(error: unknown): string {
  const hint =
    isRecord(error) && typeof error.hint === "string" ? error.hint : "";

  if (hint === "PROPOSAL_NOT_PENDING") {
    return "That proposal has already been decided, or it has expired. Nothing more was sent.";
  }
  if (hint === "PROPOSAL_NOT_APPROVED") {
    return "That proposal is not waiting to be applied.";
  }
  return mapError(error, "Could not decide that proposal. Please try again.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
