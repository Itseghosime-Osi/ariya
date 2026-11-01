"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProposalCard } from "./ProposalCard";
import { restoreProposalAction } from "../actions";
import { DESIGN_KINDS } from "../types";
import type { Proposal, ProposalDisplayStatus, ProposalFeed } from "../types";

// Fixed locale and zone so the server and client render the same string.
const DATE = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Lagos",
});

const STATUS_TONE: Record<ProposalDisplayStatus, string> = {
  pending: "text-gold-ink",
  approved: "text-gold-ink",
  interrupted: "text-wine",
  applied: "text-on-surface",
  rejected: "text-on-surface-variant",
  expired: "text-on-surface-variant",
  failed: "text-wine",
};

export function ApprovalsDesk({ initialFeed }: { initialFeed: ProposalFeed }) {
  const router = useRouter();
  const [pending, setPending] = useState(initialFeed.pending);
  const [decided, setDecided] = useState(initialFeed.decided);

  /*
   * A decision updates the list immediately, then the refresh replaces it with what the server
   * recorded — including the reason a send failed, which the card cannot know on its own.
   */
  useEffect(() => {
    setPending(initialFeed.pending);
    setDecided(initialFeed.decided);
  }, [initialFeed]);

  function handleDecided(proposal: Proposal) {
    setPending((list) => list.filter((item) => item.id !== proposal.id));
    setDecided((list) => [proposal, ...list]);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
            Waiting on you
          </p>
          {pending.length > 0 ? (
            <span className="text-xs text-on-surface-variant">
              {pending.length} {pending.length === 1 ? "request" : "requests"}
            </span>
          ) : null}
        </div>

        {pending.length === 0 ? (
          <p className="mt-3 rounded-[22px] border border-dashed border-outline-variant bg-surface-container-low p-5 text-sm text-on-surface-variant">
            Nothing is waiting. When a connected app wants to send invitations
            or reminders, its request appears here and nothing leaves your desk
            until you approve it.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onDecided={handleDecided}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
          Already decided
        </p>

        {decided.length === 0 ? (
          <p className="mt-3 rounded-[22px] border border-dashed border-outline-variant bg-surface-container-low p-5 text-sm text-on-surface-variant">
            Nothing decided yet. Approvals and rejections are listed here, so
            you can always see what an app asked for and what you did about it.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline">
            {decided.map((proposal) => (
              <DecidedRow key={proposal.id} proposal={proposal} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DecidedRow({ proposal }: { proposal: Proposal }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState<string | null>(null);
  const when = proposal.decidedAt ?? proposal.createdAt;

  async function restore() {
    setBusy(true);
    setError(null);

    const result = await restoreProposalAction(proposal.id);

    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }

    setRestored(result.data.message);
    setBusy(false);
    router.refresh();
  }

  return (
    <li className="py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-on-surface">
            {proposal.title}
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            {proposal.eventTitle} · {restored ?? describe(proposal)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
              STATUS_TONE[proposal.status]
            }`}
          >
            {statusLabel(proposal)}
          </span>
          <span className="text-xs text-on-surface-variant">
            {DATE.format(new Date(when))}
          </span>
        </div>
      </div>

      {/*
        Undoing a room or a seating plan is offered only while the copy taken before applying is
        still good: the query decides that, and the action checks it again.
      */}
      {proposal.canRestore && !restored ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={restore}
          data-testid="restore-proposal"
          className="mt-2 rounded-full border-gold/50 bg-transparent px-3 py-1 text-xs"
        >
          {busy ? "Putting it back…" : "Restore previous"}
        </Button>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-wine">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function describe(proposal: Proposal): string {
  const { status, result, kind } = proposal;
  const design = DESIGN_KINDS.includes(kind);
  const sent = design ? "nothing was changed" : "nothing was sent";

  if (status === "rejected") return `You rejected it. ${capitalise(sent)}.`;
  if (status === "expired") {
    return `It expired before you decided. ${capitalise(sent)}.`;
  }
  if (status === "interrupted") {
    return design
      ? "Interrupted. Some of it may already have been applied; check your room or seating."
      : "Interrupted. Some guests may have been contacted; check your invitations.";
  }
  if (status === "approved") return "Approved, but not applied yet.";

  if (!result) {
    return status === "applied" ? "Applied." : "It could not be applied.";
  }

  if (result.restoredAt) {
    return result.restoredCount > 0
      ? `Put back the way it was: ${result.restoredCount} ${
          result.restoredCount === 1 ? "change" : "changes"
        } undone.`
      : "Put back the way it was.";
  }

  if (design) return describeDesign(kind, status, result);

  const guests = `${result.totalCount} ${
    result.totalCount === 1 ? "guest" : "guests"
  }`;

  if (status === "failed") {
    const prefix =
      result.sentCount > 0
        ? `Reached ${result.sentCount} of ${guests} before it stopped.`
        : `Nothing was sent to ${guests}.`;
    return result.reason ? `${prefix} ${result.reason}` : prefix;
  }

  // Approved, but nothing left to send: say so rather than "sent to 0 of 8".
  if (result.sentCount === 0) {
    return result.reason
      ? `Nothing was sent. ${result.reason}`
      : `Nothing was sent to ${guests}.`;
  }

  if (result.skippedCount === 0) return `Sent to all ${guests}.`;
  return `Sent to ${result.sentCount} of ${guests}; ${result.skippedCount} were skipped.`;
}

/** A room is counted in tables; seating is counted in guests, and says how many of them moved. */
function describeDesign(
  kind: Proposal["kind"],
  status: Proposal["status"],
  result: NonNullable<Proposal["result"]>
): string {
  const short = result.skippedCount;
  const suffix =
    short > 0
      ? ` ${short} could not be ${kind === "apply_hall_layout" ? "applied" : "seated"}.`
      : "";

  if (kind === "apply_hall_layout") {
    if (result.appliedCount === 0) {
      return result.reason
        ? `The room was left as it was. ${result.reason}`
        : "The room was left as it was.";
    }
    const tables = `${result.appliedCount} ${
      result.appliedCount === 1 ? "table" : "tables"
    }`;
    const was = result.appliedCount === 1 ? "was" : "were";
    const base =
      status === "failed"
        ? `Only ${tables} ${was} written before it stopped.`
        : `The room was updated: ${tables}.`;
    return `${base}${suffix}`;
  }

  const seated = `${result.seatedCount} ${
    result.seatedCount === 1 ? "guest" : "guests"
  }`;
  if (result.seatedCount === 0) {
    return result.reason
      ? `Nobody was moved. ${result.reason}`
      : "Nobody was moved.";
  }

  const moved =
    result.movedCount > 0
      ? `, ${result.movedCount} of them from another table`
      : "";
  const was = result.seatedCount === 1 ? "was" : "were";
  const base =
    status === "failed"
      ? `Only ${seated} ${was} seated before it stopped.`
      : `${seated} ${was} seated${moved}.`;
  return `${base}${suffix}`;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function statusLabel(proposal: Proposal): string {
  const design = DESIGN_KINDS.includes(proposal.kind);

  if (proposal.status === "applied" && proposal.result?.restoredAt) {
    return "Restored";
  }

  // Applied with nothing left to send is a real outcome, and not a send.
  if (
    !design &&
    proposal.status === "applied" &&
    proposal.result?.sentCount === 0
  ) {
    return "Nothing sent";
  }

  switch (proposal.status) {
    case "applied":
      return design ? "Applied" : "Sent";
    case "rejected":
      return "Rejected";
    case "expired":
      return "Expired";
    case "failed":
      return "Failed";
    case "approved":
      return "Approved";
    case "interrupted":
      return "Interrupted";
    default:
      return "Pending";
  }
}
