"use client";

import React, { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { InvitationDesign } from "../../types";
import {
  deleteDesignVersionAction,
  listDesignVersionsAction,
  loadDesignVersionAction,
  saveDesignVersionAction,
  type DesignVersion,
} from "../../versions-actions";

/** "12 Nov, 14:05" in the host's own clock. */
export function versionWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

/**
 * F3: versions the host named and kept. Restoring one puts that exact design on the canvas as a
 * new undo step, so a restore can itself be undone. When the store is not reachable (offline, no
 * access, not set up yet) the section stays out of the way.
 */
export function VersionsSection({
  eventId,
  design,
  dark,
  onRestore,
}: {
  eventId: string;
  design: InvitationDesign;
  dark?: boolean;
  onRestore: (design: InvitationDesign) => void;
}) {
  const [list, setList] = useState<DesignVersion[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await listDesignVersionsAction(eventId);
    if (res.ok) {
      setList(res.versions);
      setAvailable(true);
    } else setAvailable(false);
  }, [eventId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!available) return null;

  const save = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    const res = await saveDesignVersionAction(eventId, name, design);
    setBusy(false);
    if (res.ok) {
      setName("");
      setMessage(`Saved "${res.version.name}".`);
      await refresh();
    } else setMessage(res.error);
  };

  const restore = async (v: DesignVersion) => {
    setBusy(true);
    const res = await loadDesignVersionAction(eventId, v.id);
    setBusy(false);
    if (res.ok) {
      onRestore(res.design);
      setMessage(`Restored "${v.name}". Undo brings your last design back.`);
    } else setMessage(res.error);
  };

  const remove = async (v: DesignVersion) => {
    setBusy(true);
    const res = await deleteDesignVersionAction(eventId, v.id);
    setBusy(false);
    if (res.ok) {
      setMessage(`Deleted "${v.name}".`);
      await refresh();
    } else setMessage("That version could not be deleted. Try again.");
  };

  const muted = dark ? "text-zinc-400" : "text-(--studio-mauve)";
  const field = cn(
    "h-8 min-w-0 flex-1 rounded-(--studio-radius-control) border px-2 text-xs outline-none pointer-coarse:h-11",
    dark
      ? "border-white/15 bg-white/[0.06] text-(--studio-cream) focus:border-(--studio-gold)"
      : "border-(--studio-line) bg-white text-(--studio-ink) focus:border-(--studio-wine)"
  );
  const small = cn(
    "min-h-8 rounded-(--studio-radius-control) border px-2 text-xs font-semibold disabled:opacity-40 pointer-coarse:min-h-11",
    dark
      ? "border-white/15 text-(--studio-cream) hover:bg-white/10"
      : "border-(--studio-line) text-(--studio-wine) hover:bg-black/5"
  );

  return (
    <section
      data-testid="versions-section"
      aria-label="Saved versions"
      className="mb-3 border-b border-hairline pb-3"
    >
      <p
        className={cn(
          "mb-2 text-xs font-semibold uppercase tracking-wide",
          muted
        )}
      >
        Saved versions
      </p>
      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label htmlFor="version-name" className="sr-only">
          Name this version
        </label>
        <input
          id="version-name"
          value={name}
          maxLength={60}
          placeholder="Name this version"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          className={field}
        />
        <button type="submit" disabled={busy || !name.trim()} className={small}>
          Save
        </button>
      </form>
      <p role="status" className={cn("mt-1.5 min-h-4 text-xs", muted)}>
        {message}
      </p>
      {list && list.length === 0 && (
        <p className={cn("text-xs", muted)}>
          Nothing saved yet. Name a version before a big change and it stays
          here.
        </p>
      )}
      <ul className="space-y-1">
        {list?.map((v) => (
          <li
            key={v.id}
            className="flex items-center gap-1.5"
            data-testid="version-row"
          >
            <span
              className="min-w-0 flex-1 truncate text-xs font-medium"
              title={v.name}
            >
              {v.name}
              <span className={cn("ml-1.5 font-normal", muted)}>
                {versionWhen(v.createdAt)}
              </span>
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void restore(v)}
              aria-label={`Restore ${v.name}`}
              className={small}
            >
              Restore
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove(v)}
              aria-label={`Delete ${v.name}`}
              className={small}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
