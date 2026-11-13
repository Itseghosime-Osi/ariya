"use client";

import React from "react";
import { CloudOff, CloudUpload, Check, X } from "lucide-react";
import type { CheckInSnapshot, QueuedAdmission, SyncOutcome } from "../offline";

function ago(iso: string, now: number) {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

/**
 * Where the desk stands: online with the guest list saved on this phone, offline and still
 * admitting, or sending what it admitted. And, after sending, anyone another phone had already let in.
 */
export function OfflineStatus({
  online,
  snapshot,
  queue,
  syncing,
  outcomes,
  onDismissOutcomes,
}: {
  online: boolean;
  snapshot: CheckInSnapshot | null;
  queue: QueuedAdmission[];
  syncing: boolean;
  outcomes: SyncOutcome[];
  onDismissOutcomes: () => void;
}) {
  const now = Date.now();
  const waiting = queue.reduce((n, q) => n + q.count, 0);
  const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;

  return (
    <div className="space-y-2" data-testid="check-in-offline-status">
      {!online ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-[#e2c58a] bg-[#fdf6e8] px-4 py-3 text-night"
        >
          <CloudOff
            size={18}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-[#8a6608]"
          />
          <div className="min-w-0 text-sm">
            {snapshot ? (
              <>
                <p className="font-semibold">
                  No signal. Check-in keeps working from this phone.
                </p>
                <p className="mt-0.5 text-[13px] text-label-2">
                  Scan, search and admit as usual.
                  {waiting > 0
                    ? ` ${people(waiting)} admitted here will be sent when the signal is back.`
                    : " Admissions are kept here and sent when the signal is back."}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold">
                  No signal, and no guest list on this phone yet.
                </p>
                <p className="mt-0.5 text-[13px] text-label-2">
                  Open Check-in once with a signal and the list is saved for
                  times like this.
                </p>
              </>
            )}
          </div>
        </div>
      ) : syncing || waiting > 0 ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-hairline bg-white/60 px-4 py-3 text-sm text-night"
        >
          <CloudUpload
            size={18}
            aria-hidden="true"
            className="shrink-0 text-burgundy"
          />
          <span>Signal back. Sending {people(waiting)} admitted offline…</span>
        </div>
      ) : snapshot ? (
        <p className="flex items-center gap-2 px-1 text-[13px] text-label-2">
          <Check size={14} aria-hidden="true" className="text-[#1f6b4a]" />
          Ready for no signal: {snapshot.guests.length} guests saved on this
          phone, updated {ago(snapshot.takenAt, now)}.
        </p>
      ) : null}

      {outcomes.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-[#e7b9b9] bg-[#fbeeee] px-4 py-3 text-night"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">
                Some admissions made offline were not counted as made
              </p>
              <ul className="mt-1 space-y-0.5 text-[13px]">
                {outcomes.map((o) => (
                  <li key={o.admission.id}>
                    <span className="font-semibold">
                      {o.admission.guestName}
                    </span>
                    {": "}
                    {o.kind === "already_in"
                      ? o.admittedByServer > 0
                        ? `only ${o.admittedByServer} of ${o.admission.count} counted. The rest were already let in on another phone.`
                        : "already let in on another phone, so not counted twice."
                      : o.kind === "refused"
                        ? `not counted (${o.reason}).`
                        : "counted."}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={onDismissOutcomes}
              aria-label="Dismiss"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-burgundy"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
