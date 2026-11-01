import { createClient } from "@/lib/supabase/server";
import { sanitiseAppName } from "@/features/mcp/app-trust";
import { listConnectedApps } from "@/features/mcp/grants";
import { proposalPayloadSchema } from "./schemas";
import type {
  ActionResult,
  ActivityEntry,
  Proposal,
  ProposalDisplayStatus,
  ProposalFeed,
  ProposalKind,
  ProposalResult,
  ProposalStatus,
} from "./types";

const SIGNED_OUT = "Sign in to see what your connected apps have asked to do.";
const READ_FAILED = "Could not load your proposals right now.";
const ACTIVITY_FAILED = "Could not load your recent activity right now.";

/**
 * A connected app has no verified name outside the consent screen: the only trustworthy one is
 * derived from a redirect URI, and by the time a proposal exists that URI is no longer at hand. So
 * the card says what it can prove — that an app is connected, or that it is not.
 */
const CONNECTED_LABEL = "A connected app";
const DISCONNECTED_LABEL = "An app that is no longer connected";
/** When the grant list itself cannot be read, say only what a proposal row proves. */
const UNKNOWN_LABEL = "An app acting as you";

/** How many decided proposals the desk remembers. The history is a courtesy, not an archive. */
const HISTORY_LIMIT = 50;
/** How much activity the Connect your AI page shows. */
const ACTIVITY_LIMIT = 50;

/**
 * A proposal is applied in the same request that approves it, so an approved row is only ever a
 * transient state. One still approved this long afterwards did not finish: the send may have
 * stopped partway, and the desk says so instead of showing a decision that looks neither pending
 * nor done.
 */
const APPLICATION_STALL_MS = 10 * 60 * 1000;

interface ProposalRow {
  id: string;
  kind: string;
  title: string;
  summary: string;
  payload: unknown;
  status: string;
  result: unknown;
  event_id: string;
  client_id: string;
  created_at: string;
  decided_at: string | null;
  expires_at: string;
  events: { title: string } | { title: string }[] | null;
}

export async function listProposalFeed(): Promise<ActionResult<ProposalFeed>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: SIGNED_OUT };

  const [{ data, error }, connected] = await Promise.all([
    supabase
      .from("ai_proposals")
      .select(
        "id, kind, title, summary, payload, status, result, event_id, client_id, created_at, decided_at, expires_at, events (title)"
      )
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT * 4),
    listConnectedApps(),
  ]);

  if (error) return { ok: false, error: READ_FAILED };

  const connectedNames = connected.ok
    ? new Map(connected.data.map((app) => [app.clientId, app.name]))
    : null;

  // One clock for every row, so two proposals on the same screen are judged against one instant.
  const now = Date.now();
  const proposalList = ((data ?? []) as ProposalRow[]).map((row) =>
    toProposal(row, connectedNames, now)
  );

  const pending = proposalList.filter(
    (proposal) => proposal.status === "pending"
  );
  const decided = proposalList
    .filter((proposal) => proposal.status !== "pending")
    .slice(0, HISTORY_LIMIT);

  return { ok: true, data: { pending, decided } };
}

/**
 * What the top bar counts. Expired rows are not waiting on anyone, so they are excluded — the same
 * rule `decide_ai_proposal` applies when it decides.
 */
export async function countPendingProposals(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("ai_proposals")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());

  if (error) return 0;

  return count ?? 0;
}

export async function listRecentActivity(): Promise<
  ActionResult<ActivityEntry[]>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: SIGNED_OUT };

  const { data, error } = await supabase
    .from("ai_activity_log")
    .select("id, tool, event_id, outcome, note, created_at, events (title)")
    .order("created_at", { ascending: false })
    .limit(ACTIVITY_LIMIT);

  if (error) return { ok: false, error: ACTIVITY_FAILED };

  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      id: row.id,
      tool: row.tool,
      eventTitle: eventTitleOf(row.events),
      outcome: row.outcome as ActivityEntry["outcome"],
      note: row.note ?? null,
      createdAt: row.created_at,
    })),
  };
}

function toProposal(
  row: ProposalRow,
  connectedNames: Map<string, string> | null,
  now: number
): Proposal {
  const payload = proposalPayloadSchema.safeParse(row.payload);
  const guestIds = payload.success ? payload.data.guestIds : [];
  const note = payload.success ? (payload.data.note ?? null) : null;
  const selfName = connectedNames?.get(row.client_id);

  return {
    id: row.id,
    kind: row.kind as ProposalKind,
    title: row.title,
    summary: row.summary,
    note,
    guestCount: guestIds.length,
    status: displayStatus(row, now),
    eventId: row.event_id,
    eventTitle: eventTitleOf(row.events) ?? "A celebration",
    appLabel: !connectedNames
      ? UNKNOWN_LABEL
      : connectedNames.has(row.client_id)
        ? CONNECTED_LABEL
        : DISCONNECTED_LABEL,
    // Cleaned and cut short, and only ever rendered as a quotation beside the neutral label.
    appSelfName: selfName ? sanitiseAppName(selfName, 40) : null,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    decidedAt: row.decided_at,
    result: resultOf(row, guestIds.length),
  };
}

/** The recorded outcome, bounded to numbers and a short reason so nothing else can reach the card. */
function resultOf(row: ProposalRow, totalCount: number): ProposalResult | null {
  if (row.status !== "applied" && row.status !== "failed") return null;
  if (!row.result || typeof row.result !== "object") return null;

  const result = row.result as Record<string, unknown>;
  const reason = typeof result.reason === "string" ? result.reason.trim() : "";

  return {
    sentCount: countOf(result.sentCount),
    skippedCount: countOf(result.skippedCount),
    totalCount,
    reason: reason || null,
  };
}

function countOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

/**
 * A pending row past its deadline is expired: nothing will apply it, so it must not look decidable.
 * An approved row that has sat that way too long is interrupted: it stays decided, never pending.
 */
function displayStatus(row: ProposalRow, now: number): ProposalDisplayStatus {
  if (row.status === "pending" && new Date(row.expires_at).getTime() <= now) {
    return "expired";
  }

  if (
    row.status === "approved" &&
    row.decided_at !== null &&
    now - new Date(row.decided_at).getTime() > APPLICATION_STALL_MS
  ) {
    return "interrupted";
  }

  return row.status as ProposalStatus;
}

function eventTitleOf(
  events: { title: string } | { title: string }[] | null
): string | null {
  if (!events) return null;
  return Array.isArray(events) ? (events[0]?.title ?? null) : events.title;
}
