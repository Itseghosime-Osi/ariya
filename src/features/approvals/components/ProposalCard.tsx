"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { HallPlan } from "./HallPlan";
import { approveProposalAction, rejectProposalAction } from "../actions";
import {
  DESIGN_KINDS,
  type Proposal,
  type ProposalKind,
  type ProposalPreview,
  type SeatingPreview,
} from "../types";

// Fixed locale and zone so the server and client render the same string.
const DATE = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Lagos",
});

const KIND_LABEL: Record<ProposalKind, string> = {
  send_invitations: "Invitations",
  send_reminders: "Reminders",
  apply_hall_layout: "Hall layout",
  apply_seating_plan: "Seating plan",
};

/** What the confirmation actually promises, in the app's own vocabulary. */
const VERB: Record<ProposalKind, string> = {
  send_invitations: "send invitations",
  send_reminders: "send reminders",
  apply_hall_layout: "apply a hall layout",
  apply_seating_plan: "apply a seating plan",
};

export function ProposalCard({
  proposal,
  onDecided,
}: {
  proposal: Proposal;
  onDecided: (proposal: Proposal) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const design = DESIGN_KINDS.includes(proposal.kind);
  const preview = proposal.preview;
  /*
   * A room or seating change the desk could not work out against this celebration is never offered
   * for approval: the host would be agreeing to a sentence rather than to a room they have seen.
   */
  const blind = design && preview === null;
  const guests = `${proposal.guestCount} ${
    proposal.guestCount === 1 ? "guest" : "guests"
  }`;

  async function approve() {
    setBusy("approve");
    setError(null);

    const result = await approveProposalAction(proposal.id);

    if (!result.ok) {
      setBusy(null);
      setConfirming(false);
      setError(result.error);
      return;
    }

    const outcome = result.data;
    onDecided({
      ...proposal,
      status: outcome.status,
      decidedAt: new Date().toISOString(),
      result: {
        sentCount: outcome.sentCount,
        skippedCount: outcome.skippedCount,
        totalCount: totalCount(proposal.kind, outcome),
        reason: null,
        appliedCount: outcome.appliedCount,
        movedCount: outcome.movedCount,
        seatedCount: outcome.seatedCount,
        tableCount:
          preview?.kind === "hall" ? preview.proposed.tables.length : 0,
        restoredAt: null,
        restoredCount: 0,
        // Whether the previous room or seating was kept is only known once the row is read back,
        // and the refresh that follows this replaces the whole entry.
        restoreUnavailable: null,
      },
      preview: null,
      canRestore: false,
    });
  }

  async function reject() {
    setBusy("reject");
    setError(null);

    const result = await rejectProposalAction(proposal.id);

    if (!result.ok) {
      setBusy(null);
      setError(result.error);
      return;
    }

    onDecided({
      ...proposal,
      status: "rejected",
      decidedAt: new Date().toISOString(),
      result: null,
      preview: null,
      canRestore: false,
    });
  }

  return (
    <li
      data-testid="approval-card"
      className="rounded-[22px] border border-wine/10 bg-surface-container-low p-4 sm:p-5"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
        {KIND_LABEL[proposal.kind]} · {proposal.eventTitle}
      </p>

      <h3 className="mt-2 font-serif text-xl font-bold leading-snug text-on-surface">
        {proposal.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">
        {proposal.summary}
      </p>

      {proposal.note ? (
        <blockquote className="mt-3 border-l-2 border-gold/50 pl-3 text-sm italic leading-relaxed text-on-surface-variant">
          {proposal.note}
        </blockquote>
      ) : null}

      {/*
        The neutral label is the claim; the self-name is only a quotation. An app has no verified
        name outside its consent screen, so the two never merge into one line of text.
      */}
      <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-on-surface-variant">
        <Icon name="link" size={14} className="shrink-0 text-gold-ink" />
        <span>{proposal.appLabel}</span>
        {proposal.appSelfName ? (
          <span className="text-on-surface-variant/70">
            calls itself “{proposal.appSelfName}”
          </span>
        ) : null}
        <span aria-hidden="true" className="text-on-surface-variant/40">
          ·
        </span>
        <span>{guests}</span>
        <span aria-hidden="true" className="text-on-surface-variant/40">
          ·
        </span>
        <span>Expires {DATE.format(new Date(proposal.expiresAt))}</span>
      </p>

      {preview ? <PreviewPanel preview={preview} /> : null}

      {blind ? (
        <div className="mt-4">
          <p className="text-xs leading-relaxed text-on-surface-variant">
            Àríyá could not work out what this would change in this celebration,
            so there is nothing to show you and nothing to approve. Reject it
            and ask your app to propose again.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={reject}
            className="mt-2 w-full rounded-full border-gold/50 bg-transparent sm:w-auto"
          >
            {busy === "reject" ? "Rejecting…" : "Reject"}
          </Button>
        </div>
      ) : confirming ? (
        <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/5 p-3 sm:p-4">
          <p role="status" className="text-xs leading-relaxed text-on-surface">
            {confirmation(proposal, preview, guests)}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="gold"
              disabled={busy !== null}
              onClick={approve}
              data-testid="confirm-approve-proposal"
              className="rounded-full"
            >
              {busy === "approve"
                ? design
                  ? "Applying…"
                  : "Sending…"
                : design
                  ? `Yes, ${VERB[proposal.kind]}`
                  : `Yes, send to ${guests}`}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => setConfirming(false)}
              className="rounded-full border-gold/50 bg-transparent"
            >
              Not yet
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="gold"
            disabled={busy !== null}
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
            data-testid="approve-proposal"
            className="rounded-full"
          >
            <Icon name="check" size={15} className="mr-2" />
            {design ? "Approve and apply" : "Approve and send"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={reject}
            data-testid="reject-proposal"
            className="rounded-full border-gold/50 bg-transparent"
          >
            {busy === "reject" ? "Rejecting…" : "Reject"}
          </Button>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-2xl border border-wine/30 bg-wine/5 p-3 text-xs font-medium text-wine"
        >
          {error}
        </p>
      ) : null}
    </li>
  );
}

/** What approving will do, in the words the room itself uses. */
function confirmation(
  proposal: Proposal,
  preview: ProposalPreview | null,
  guests: string
): string {
  if (preview?.kind === "hall") {
    const shared = preview.problems.length > 0;
    return `Approving this will replace the room for ${proposal.eventTitle} with the plan above.${
      shared
        ? " The designer's own rules still object to part of it, so check the notes before you decide."
        : ""
    } It can be put back for 7 days from the decided list.`;
  }

  if (preview?.kind === "seating") {
    const tables = preview.tables.length;
    return `Approving this will seat ${preview.seatedCount} ${
      preview.seatedCount === 1 ? "guest" : "guests"
    } at ${tables} ${tables === 1 ? "table" : "tables"} for ${
      proposal.eventTitle
    }${preview.movedCount > 0 ? `, moving ${preview.movedCount} from where they sit now` : ""}. It can be put back for 7 days from the decided list.`;
  }

  return `Approving this will ${VERB[proposal.kind]} to ${guests} for ${proposal.eventTitle}. It uses your invitation quota, and it cannot be undone.`;
}

/** The counts a decided card needs, counted the way the room and the seating are counted. */
function totalCount(
  kind: ProposalKind,
  outcome: {
    sentCount: number;
    skippedCount: number;
    appliedCount: number;
    seatedCount: number;
    movedCount: number;
  }
): number {
  if (kind === "apply_seating_plan") {
    return outcome.seatedCount + outcome.movedCount + outcome.skippedCount;
  }

  if (kind === "apply_hall_layout") {
    return outcome.appliedCount + outcome.skippedCount;
  }

  return outcome.sentCount + outcome.skippedCount;
}

function PreviewPanel({ preview }: { preview: ProposalPreview }) {
  if (preview.kind === "seating") {
    return <SeatingPlanView preview={preview} />;
  }

  return (
    <>
      <HallPlan preview={preview} />
      {/*
        The drawing is the room; these are the sentences about it, so a host who cannot read a plan
        from above still knows what they are agreeing to.
      */}
      <ul
        aria-label="What changes in the room"
        className="mt-2.5 space-y-1 text-xs leading-relaxed text-on-surface-variant"
      >
        {preview.changes.map((change) => (
          <li key={change}>{change}</li>
        ))}
      </ul>

      {preview.problems.length > 0 ? (
        <ul
          aria-label="What the designer still objects to"
          className="mt-2 space-y-1 text-xs leading-relaxed text-wine"
        >
          {preview.problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

/**
 * Who would sit where. The hall gets a drawing because a room is a thing you can recognise; seating
 * is a list of names, and the names are the part a host can actually check.
 */
function SeatingPlanView({ preview }: { preview: SeatingPreview }) {
  const tables = preview.tables.filter((table) => table.guests.length > 0);
  // Everyone who would be sitting at these tables afterwards, not only the guests this plan adds.
  const guests = preview.tables.reduce(
    (total, table) => total + table.guests.length,
    0
  );

  return (
    <div className="mt-3 rounded-2xl border border-wine/10 bg-surface-container-high/60 p-3 sm:p-4">
      <p className="text-xs font-medium leading-relaxed text-on-surface">
        {guests} {guests === 1 ? "guest" : "guests"} at {tables.length}{" "}
        {tables.length === 1 ? "table" : "tables"}
        {preview.seatedCount > 0
          ? `, ${preview.seatedCount} of them seated for the first time`
          : ""}
        {preview.movedCount > 0
          ? `, ${preview.movedCount} moving from another table`
          : ""}
        .
      </p>

      <ul className="mt-2.5 space-y-2">
        {tables.map((table) => (
          <li key={table.id} className="text-xs text-on-surface-variant">
            <span className="font-medium text-on-surface">{table.name}</span>{" "}
            <span className="text-on-surface-variant/70">
              {table.occupied} of {table.capacity} seats
            </span>
            <span className="mt-0.5 block leading-relaxed">
              {table.guests
                .map((guest) =>
                  guest.moved && guest.fromTable
                    ? `${guest.name} (from ${guest.fromTable})`
                    : guest.name
                )
                .join(", ")}
            </span>
          </li>
        ))}
      </ul>

      {preview.missing.length > 0 ? (
        <p className="mt-2.5 text-xs leading-relaxed text-wine">
          No longer on this celebration:{" "}
          {preview.missing
            .map((guest) => guest.name ?? "a guest who has since been removed")
            .join(", ")}
          .
        </p>
      ) : null}

      {preview.warnings.length > 0 ? (
        <ul className="mt-2.5 space-y-1">
          {preview.warnings.map((warning) => (
            <li
              key={warning}
              className="text-xs leading-relaxed text-on-surface-variant"
            >
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
