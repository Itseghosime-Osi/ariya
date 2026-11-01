"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { approveProposalAction, rejectProposalAction } from "../actions";
import { APPLICABLE_KINDS, type Proposal, type ProposalKind } from "../types";

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

  const applicable = APPLICABLE_KINDS.includes(proposal.kind);
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
        totalCount: proposal.guestCount,
        reason: null,
      },
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

      {applicable ? (
        confirming ? (
          <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/5 p-3 sm:p-4">
            <p
              role="status"
              className="text-xs leading-relaxed text-on-surface"
            >
              Approving this will {VERB[proposal.kind]} to {guests} for{" "}
              {proposal.eventTitle}. It uses your invitation quota, and it
              cannot be undone.
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
                {busy === "approve" ? "Sending…" : `Yes, send to ${guests}`}
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
              Approve and send
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
        )
      ) : (
        <div className="mt-4">
          <p className="text-xs leading-relaxed text-on-surface-variant">
            Àríyá cannot carry this out yet, so approving it would do nothing.
            Reject it and ask your app for the invitations or reminders it can
            send instead.
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
