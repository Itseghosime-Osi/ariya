/**
 * Shared by the server actions, the queries and the screen. A `"use server"` module may only export
 * async functions, so the types live here.
 */

import type { HallLayout } from "@/features/seating/hall/model";
import type { SeatingMode } from "@/features/seating/plan-checks";

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

/** The kinds that change the room or the seating, so a card must preview and offer to undo them. */
export const DESIGN_KINDS: ProposalKind[] = [
  "apply_hall_layout",
  "apply_seating_plan",
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
  /**
   * What a pending hall or seating proposal would do, read from the celebration as it stands right
   * now rather than from what the payload said when it arrived. Null for sends, and for anything
   * already decided (the counts on `result` say what happened instead).
   */
  preview: ProposalPreview | null;
  /** True when the previous room or seating can still be put back from this card. */
  canRestore: boolean;
}

/** What applying a proposal came to, so a decided card can say exactly what happened. */
export interface ProposalResult {
  /** Guests actually contacted. */
  sentCount: number;
  /** Guests in the proposal who were not contacted, or assignments that no longer fit. */
  skippedCount: number;
  /** Everyone the proposal named, so "12 of 20" is exact. */
  totalCount: number;
  /** A reason safe to show, when there is one. */
  reason: string | null;
  /** Tables written, for a hall proposal. */
  appliedCount: number;
  /** Guests moved from a table they were already at. */
  movedCount: number;
  /** Guests seated, for a seating proposal. */
  seatedCount: number;
  tableCount: number;
  /** When the host put the previous room or seating back, or null if they have not. */
  restoredAt: string | null;
  /** Tables or guests put back, so a restored card can say how much was undone. */
  restoredCount: number;
  /** Why no "Restore previous" is offered, when it is not. */
  restoreUnavailable: string | null;
}

/** One table on the previewed floor plan: where it stands, and what it is. */
export interface PreviewTable {
  id: string;
  name: string;
  capacity: number;
  shape: string;
  /** Centimetres from the top-left corner, to the table's centre. */
  x: number;
  y: number;
}

/** The room a hall proposal would create, beside the room the celebration has today. */
export interface HallPreview {
  kind: "hall";
  proposed: { layout: HallLayout; tables: PreviewTable[] };
  current: { layout: HallLayout | null; tables: PreviewTable[] };
  /** Plain-language differences a person can check without reading the plan. */
  changes: string[];
  /** Anything the designer's own rules still object to. Should be empty. */
  problems: string[];
}

/** Who would sit where, and who would move to get there. */
export interface SeatingPreview {
  kind: "seating";
  mode: SeatingMode;
  seatedCount: number;
  movedCount: number;
  unchangedCount: number;
  tables: SeatingPreviewTable[];
  /** Every move, named, for a rearrange proposal's confirmation. */
  moves: {
    guestId: string;
    name: string;
    fromTable: string;
    toTable: string;
  }[];
  /** Guests the plan names who are no longer on the celebration. */
  missing: { guestId: string; name: string | null }[];
  /** Capacity and leftover-seat notes, written by us. */
  warnings: string[];
}

export interface SeatingPreviewTable {
  id: string;
  name: string;
  capacity: number;
  /** Seats taken once this plan is applied, counting party sizes. */
  occupied: number;
  guests: {
    id: string;
    name: string;
    partySize: number;
    moved: boolean;
    fromTable: string | null;
  }[];
}

export type ProposalPreview = HallPreview | SeatingPreview;

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
  /** Tables, guests seated or moved: zero for a send, and the honest figures for the rest. */
  appliedCount: number;
  seatedCount: number;
  movedCount: number;
  message: string;
}

/** What putting the previous room or seating back came to. */
export interface RestoreOutcome {
  proposalId: string;
  message: string;
  restoredCount: number;
}
