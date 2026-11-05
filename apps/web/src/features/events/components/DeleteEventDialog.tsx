"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/lib/use-is-mobile";
import { deleteEventAction } from "@/features/events/settings-actions";

const GHOST =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

/**
 * The one place a celebration is deleted for good. Nothing is deleted until the host has typed the
 * celebration's exact name and ticked that they understand; the server checks the name again.
 */
export function DeleteEventDialog({
  event,
  open,
  onOpenChange,
  onDeleted,
}: {
  event: { id: string; title: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const sheet = useIsMobile();
  const [typed, setTyped] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim() === event.title.trim();

  const close = (next: boolean) => {
    if (busy) return;
    onOpenChange(next);
    if (!next) {
      setTyped("");
      setUnderstood(false);
      setError(null);
    }
  };

  const confirm = async () => {
    if (!matches || !understood) return;
    setBusy(true);
    setError(null);
    const res = await deleteEventAction(event.id, typed);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not delete this celebration.");
      return;
    }
    onOpenChange(false);
    onDeleted();
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent sheet={sheet}>
        <DialogHeader>
          <div className="mb-1 grid h-11 w-11 place-items-center rounded-[14px] bg-error-container text-error">
            <Icon name="delete" size={20} />
          </div>
          <DialogTitle className="text-error">
            Delete this celebration forever?
          </DialogTitle>
          <DialogDescription>
            This removes <b className="text-night">{event.title}</b> with all of
            its guests, replies, seating, vendors and records. It cannot be
            undone and cannot be recovered. To keep a record, archive it
            instead.
          </DialogDescription>
        </DialogHeader>

        <div>
          <label
            htmlFor="delete-confirm-name"
            className="mb-1 block px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-label-2"
          >
            Type the celebration&rsquo;s name to confirm
          </label>
          <input
            id="delete-confirm-name"
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={event.title}
            className="desk-field min-h-[44px] w-full rounded-2xl px-4 text-base text-night focus-visible:ring-2 focus-visible:ring-error/40 focus-visible:outline-none sm:text-sm"
          />
          <p className="mt-1.5 px-1 text-xs text-label-2">
            Exactly as written:{" "}
            <span className="font-semibold">{event.title}</span>
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-hairline bg-white/40 p-3 text-sm text-night">
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--burgundy)]"
          />
          <span>I understand this permanently deletes everything in it.</span>
        </label>

        {error && (
          <p role="alert" className="text-sm font-semibold text-error">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            disabled={busy}
            className={`${GHOST} text-label-2 hover:text-night`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!matches || !understood || busy}
            className={`${GHOST} bg-error text-white hover:bg-error/90 disabled:opacity-40`}
          >
            {busy ? "Deleting…" : "Delete forever"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
