/**
 * Shared by the server actions, the queries and the screen. A `"use server"` module may only export
 * async functions, so the types live here.
 */

export const APPROVALS_PATH = "/approvals";
export const CONNECT_AI_PATH = "/connect-ai";

export type ProposalStatus =
  "pending" | "approved" | "rejected" | "expired" | "applied" | "failed";

/**
 * What the desk shows. `interrupted` is not a stored status: an approved proposal whose applying
 * never finished is still `approved` in its row, and the desk says what that means rather than
 * offering it again or pretending it is done.
 */
export type ProposalDisplayStatus = ProposalStatus | "interrupted";

export type ProposalKind =
  | "send_invitations"
  | "send_reminders"
  | "apply_hall_layout"
  | "apply_seating_plan";

/** The kinds the app can carry out today. The other two are raised but not applied. */
export const APPLICABLE_KINDS: ProposalKind[] = [
  "send_invitations",
  "send_reminders",
];

/** The repo's action result: never throws at the boundary, so a form can always render something. */
export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; error: string };

/** One proposal as the approvals desk renders it. */
export interface Proposal {
  id: string;
  kind: ProposalKind;
  title: string;
  summary: string;
  /** The connected app's own words, shown as a quotation and never as the app's identity. */
  note: string | null;
  guestCount: number;
  /** A `pending` row past its deadline is shown as `expired`, which is what it is. */
  status: ProposalDisplayStatus;
  eventId: string;
  eventTitle: string;
  /** Never the client-supplied name: an app has no verified name outside the consent screen. */
  appLabel: string;
  /**
   * What the app calls itself, in its own registration. Shown small and muted beside the neutral
   * label so a host can recognise the app without the name ever reading as verified.
   */
  appSelfName: string | null;
  createdAt: string;
  expiresAt: string;
  decidedAt: string | null;
  /** How applying finished, when it did. Written by us, never by the app. */
  result: ProposalResult | null;
}

/** What applying a proposal came to, so a decided card can say exactly what happened. */
export interface ProposalResult {
  /** Guests actually contacted. */
  sentCount: number;
  /** Guests in the proposal who were not contacted. */
  skippedCount: number;
  /** Everyone the proposal named, so "12 of 20" is exact. */
  totalCount: number;
  /** A reason safe to show, when there is one. */
  reason: string | null;
}

export interface ProposalFeed {
  pending: Proposal[];
  decided: Proposal[];
}

/** One tool call, as the Connect your AI page lists it. */
export interface ActivityEntry {
  id: string;
  tool: string;
  eventTitle: string | null;
  outcome: "ok" | "denied" | "error";
  note: string | null;
  createdAt: string;
}

/** What approving a proposal did, in the words the card should show afterwards. */
export interface ApplyOutcome {
  proposalId: string;
  status: ProposalStatus;
  sentCount: number;
  skippedCount: number;
  message: string;
}
