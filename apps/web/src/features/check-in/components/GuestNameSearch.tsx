"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { CheckInMatch } from "../types";

interface GuestNameSearchProps {
  eventId: string;
  /** The desk's search: the server when there is a signal, the phone's copy when there is not. */
  search: (query: string) => Promise<{ ok: boolean; guests: CheckInMatch[] }>;
  disabled: boolean;
  /** Continues exactly as a scan does: the desk verifies the pass, then the door staff taps Admit. */
  onPick: (code: string) => void;
}

const WAIT_MS = 300;

/** For a seal that will not scan: find the guest by name, then verify and admit as usual. */
export function GuestNameSearch({
  eventId,
  search,
  disabled,
  onPick,
}: GuestNameSearchProps) {
  const [text, setText] = useState("");
  const [matches, setMatches] = useState<CheckInMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);

  const query = text.trim();
  const ready = query.length >= 2;

  useEffect(() => {
    if (!ready) return;
    let stale = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const res = await search(query);
      if (stale) return;
      setMatches(res.guests);
      setFailed(!res.ok);
      setSearching(false);
    }, WAIT_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [eventId, query, ready, search]);

  const shown = ready ? matches : [];

  return (
    <section className="bento-card space-y-4 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Icon name="search" className="text-base text-gold-ink" />
        <h2 className="font-display text-lg font-bold text-night">
          Find a guest by name
        </h2>
      </div>

      <div>
        <label
          htmlFor="guest-name-search"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink"
        >
          Name, or part of it
        </label>
        <input
          id="guest-name-search"
          type="search"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Adeleke"
          className="desk-field min-h-12 w-full rounded-2xl px-4 text-base text-night outline-hidden placeholder:text-label-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        />
        <p className="mt-1.5 text-[13px] text-label-2">
          For a seal that will not scan. Only guests who have accepted are
          listed.
        </p>
      </div>

      <div aria-live="polite">
        {ready && searching && shown.length === 0 && (
          <p className="text-[13px] text-label-2">Searching…</p>
        )}
        {failed && (
          <p role="alert" className="text-[13px] font-semibold text-red-900">
            Could not search the guest list. Try again.
          </p>
        )}
        {ready && !searching && !failed && shown.length === 0 && (
          <p className="text-[13px] text-label-2">
            No guest who has accepted matches &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>

      {shown.length > 0 && (
        <ul className="divide-y divide-hairline rounded-2xl border border-hairline">
          {shown.map((g) => {
            const left = g.attending_count - g.checked_in_count;
            return (
              <li key={g.guest_id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onPick(g.code);
                    setText("");
                    setMatches([]);
                  }}
                  className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-white/50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-burgundy"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-night">
                      {g.guest_name}
                    </span>
                    <span className="block text-[13px] text-label-2">
                      {g.table_name || "Unseated"} · {g.checked_in_count} of{" "}
                      {g.attending_count} arrived
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ${
                      left > 0
                        ? "bg-burgundy text-ivory"
                        : "bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    {left > 0 ? "Verify" : "All arrived"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
