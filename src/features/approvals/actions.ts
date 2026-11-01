"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mapError } from "@/lib/errors";
import { sendGuestInvitationEmailAction } from "@/features/invitations/actions";
import { sendBatchReminderAction } from "@/features/reminders/actions";
import { proposalIdSchema, proposalPayloadSchema } from "./schemas";
import {
  APPROVALS_PATH,
  type ActionResult,
  type ApplyOutcome,
  type ProposalKind,
  type ProposalStatus,
} from "./types";

const SIGNED_OUT = "Sign in to approve a proposal.";
const UNIDENTIFIED = "That proposal could not be identified.";
const NOT_AVAILABLE =
  "That kind of proposal cannot be applied yet. Nothing was sent, and nothing was changed.";

interface ProposalRow {
  kind: string;
  event_id: string;
  payload: unknown;
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

  const payload = proposalPayloadSchema.safeParse(proposal.payload);
  if (!payload.success) {
    return recordAndReport(
      parsedId.data,
      "failed",
      { reason: "The proposal's details were not in a form Àríyá can act on." },
      "This proposal's details were not in a form Àríyá can act on, so nothing was sent."
    );
  }

  const kind = proposal.kind as ProposalKind;
  if (kind !== "send_invitations" && kind !== "send_reminders") {
    revalidatePath(APPROVALS_PATH);
    return { ok: false, error: NOT_AVAILABLE };
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
  const supabase = await createClient();

  await supabase.rpc("record_ai_proposal_result", {
    p_id: proposalId,
    p_status: status,
    p_result: {
      sentCount: outcome.sentCount,
      skippedCount: outcome.skippedCount,
      ...(outcome.reason ? { reason: outcome.reason } : {}),
    },
  });

  return {
    proposalId,
    status: status as ProposalStatus,
    sentCount: outcome.sentCount,
    skippedCount: outcome.skippedCount,
    message: outcome.message,
  };
}

async function recordAndReport(
  proposalId: string,
  status: "applied" | "failed",
  result: Record<string, unknown>,
  message: string
): Promise<ActionResult<ApplyOutcome>> {
  const saved = await saveOutcome(proposalId, status, {
    sentCount: 0,
    skippedCount: 0,
    reason: String(result.reason ?? ""),
    message,
  });

  revalidatePath(APPROVALS_PATH);
  return { ok: true, data: saved };
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
