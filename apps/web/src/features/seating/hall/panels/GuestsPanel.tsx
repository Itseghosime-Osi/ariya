"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Crown, Hand, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeatingGuest, TableWithGuests } from "../../types";
import { Section, TableGlyph } from "../studio-ui";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// ---------------------------------------------------------------- guests

/** Whose guest this is, with a colour dot that is never the only signal. */
const SIDES: Record<string, { label: string; dot: string }> = {
  bride: { label: "Bride's side", dot: "#6b1e2e" },
  groom: { label: "Groom's side", dot: "#3b5b8a" },
  family: { label: "Family", dot: "#2e6a4f" },
  vip: { label: "VIP list", dot: "#b8864b" },
  mutual: { label: "Both sides", dot: "#8a6620" },
  planner: { label: "Planner", dot: "#5a474e" },
  imported: { label: "Imported", dot: "#5a474e" },
};

export function SideChip({ side }: { side: string | null | undefined }) {
  const s = SIDES[(side || "").toLowerCase()];
  if (!s) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#f6f1e8] px-1.5 py-0.5 text-[10px] font-semibold text-night">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: s.dot }}
        aria-hidden="true"
      />
      {s.label}
    </span>
  );
}

export function GuestsPanel({
  guests,
  tables,
  assigning,
  onStartAssign,
  onAssign,
  onFocusTable,
  onOpenFit,
}: {
  guests: SeatingGuest[];
  tables: TableWithGuests[];
  assigning: string | null;
  onStartAssign: (guestId: string | null) => void;
  onAssign: (guestId: string, tableId: string) => void;
  onFocusTable: (id: string) => void;
  /** Opens the Fit tool, where the hall is filled with tables. */
  onOpenFit?: () => void;
}) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");
  // A long list is drawn 50 at a time: a 600-guest wedding no longer builds 600 cards at once.
  // Search and the group filter still look through everyone.
  const PAGE = 50;
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [q, group]);
  const groups = useMemo(
    () =>
      Array.from(
        new Set(guests.map((g) => g.group_name || g.side || "Guests"))
      ).slice(0, 8),
    [guests]
  );
  const list = guests.filter(
    (g) =>
      (group === "all" || (g.group_name || g.side || "Guests") === group) &&
      g.name.toLowerCase().includes(q.trim().toLowerCase())
  );
  // The same split as the rest of the studio: accepted people can be seated now; replies still
  // awaited can be placed early but are not counted as waiting.
  const toSeat = guests
    .filter((g) => g.status === "accepted")
    .reduce((a, g) => a + g.attending_count, 0);
  const awaiting = guests
    .filter((g) => g.status === "pending")
    .reduce((a, g) => a + g.attending_count, 0);

  return (
    <div>
      <Section
        title="Tables in the hall"
        aside={
          <span className="text-[11px] text-label-2">
            {tables.length} {tables.length === 1 ? "table" : "tables"}
          </span>
        }
      >
        {tables.length === 0 ? (
          <div className="rounded-xl bg-[#f6f1e8] p-3">
            <p className="text-xs text-night">
              <strong className="font-semibold">Add tables first.</strong>{" "}
              Guests can only be seated at a table. Use + at the top of the hall
              to add one, or fill the hall in one go.
            </p>
            {onOpenFit && (
              <button
                type="button"
                onClick={onOpenFit}
                className="mt-2 inline-flex min-h-11 items-center rounded-full bg-night px-4 text-xs font-semibold text-white hover:bg-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                Fill the hall with tables
              </button>
            )}
          </div>
        ) : (
          <ul className="-mx-1 flex max-h-[148px] flex-wrap gap-1.5 overflow-y-auto px-1 py-0.5">
            {tables.map((t) => {
              const full = t.occupiedSeats >= t.capacity;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() =>
                      assigning && !full
                        ? onAssign(assigning, t.id)
                        : onFocusTable(t.id)
                    }
                    className={cn(
                      "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
                      assigning && !full
                        ? "border-burgundy bg-burgundy/5 text-burgundy hover:bg-burgundy hover:text-white"
                        : "border-hairline bg-white text-night hover:border-night/40"
                    )}
                  >
                    <TableGlyph
                      shape={t.shape}
                      seats={t.capacity}
                      filled={t.occupiedSeats}
                      size={18}
                    />
                    <span className="font-semibold">{t.name}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 tabular-nums",
                        full
                          ? "bg-burgundy text-white"
                          : "bg-[#f3ead8] text-[#5c4013]"
                      )}
                    >
                      {t.occupiedSeats}/{t.capacity}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section
        title="Not at a table yet"
        aside={
          <span className="text-[11px] font-semibold tabular-nums text-label-2">
            {toSeat > 0 && (
              <span className="mr-1 rounded-full bg-burgundy px-2 py-0.5 text-white">
                {toSeat} to seat
              </span>
            )}
            {awaiting > 0 && `${awaiting} awaiting reply`}
          </span>
        }
      >
        {assigning && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-night px-3 py-2.5 text-xs text-white">
            <Hand size={14} className="shrink-0 text-[#e9c98a]" />
            <span className="flex-1">
              Now click a table in the hall (or above) for{" "}
              <strong>{guests.find((g) => g.id === assigning)?.name}</strong>.
            </span>
            <button
              type="button"
              onClick={() => onStartAssign(null)}
              className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/15"
              aria-label="Stop seating this guest"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-label-2"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a guest"
            aria-label="Find a guest"
            className="h-10 w-full rounded-full border border-hairline bg-white pl-8 pr-3 text-base outline-none focus:border-night sm:text-sm"
          />
        </div>
        {groups.length > 1 && (
          <div
            className="mt-2 flex flex-wrap gap-1.5"
            role="group"
            aria-label="Filter by group"
          >
            {["all", ...groups].map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={group === g}
                onClick={() => setGroup(g)}
                className="min-h-8 rounded-full border border-hairline bg-white px-2.5 text-[11px] font-semibold capitalize text-label-2 aria-pressed:border-night aria-pressed:bg-night aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-burgundy"
              >
                {g === "all" ? "Everyone" : g}
              </button>
            ))}
          </div>
        )}
        {guests.length === 0 ? (
          <p className="mt-4 rounded-xl bg-[#f6f1e8] px-3 py-4 text-center text-sm text-night">
            Everyone has a seat.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {list.slice(0, limit).map((g) => (
              <li
                key={g.id}
                className={cn(
                  "rounded-xl border bg-white p-2 transition-colors",
                  assigning === g.id
                    ? "border-burgundy ring-1 ring-burgundy"
                    : "border-hairline"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                      g.is_vip
                        ? "bg-[#e9c98a] text-[#3a2410]"
                        : "bg-[#f1ece4] text-night"
                    )}
                    aria-hidden="true"
                  >
                    {g.is_vip ? <Crown size={13} /> : initials(g.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-night">
                      {g.name}
                    </p>
                    {g.seating_conflict_at && (
                      <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-[#fdf1d8] px-2 py-0.5 text-[10px] font-semibold text-[#7a4a06]">
                        <AlertTriangle size={11} aria-hidden="true" />
                        party size changed, please seat again
                      </p>
                    )}
                    <p className="truncate text-[11px] text-label-2">
                      {g.attending_count}{" "}
                      {g.attending_count === 1 ? "seat" : "seats"}
                      {g.group_name && ` · ${g.group_name}`}
                      {g.status === "pending" && " · awaits reply"}
                    </p>
                    {/* What matters when choosing a table, in words as well as colour. */}
                    <p className="mt-1 flex flex-wrap gap-1">
                      <SideChip side={g.side} />
                      {g.is_vip && (
                        <span className="rounded-full bg-[#e9c98a]/40 px-1.5 py-0.5 text-[10px] font-semibold text-[#5c3d0c]">
                          VIP
                        </span>
                      )}
                      {g.dietary && (
                        <span className="max-w-[12rem] truncate rounded-full bg-[#e7f1ea] px-1.5 py-0.5 text-[10px] font-semibold text-[#1f6b4a]">
                          {g.dietary}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={tables.length === 0}
                    title={tables.length === 0 ? "Add tables first" : undefined}
                    onClick={() =>
                      onStartAssign(assigning === g.id ? null : g.id)
                    }
                    aria-pressed={assigning === g.id}
                    aria-label={`Seat ${g.name}`}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-night px-4 text-xs font-semibold text-white transition-colors hover:bg-burgundy aria-pressed:bg-burgundy disabled:bg-[#eadfd9] disabled:text-label-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                  >
                    {assigning === g.id ? "Choosing…" : "Seat"}
                  </button>
                </div>
                {/* The table list appears only for the guest being seated: one picker, not one
                    per card, and never when there is no table to pick. */}
                {assigning === g.id && tables.length > 0 && (
                  <select
                    aria-label={`Assign ${g.name} to a table`}
                    value=""
                    onChange={(e) =>
                      e.target.value && onAssign(g.id, e.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-hairline bg-[#fbf8f2] px-2 text-sm text-night focus:border-night focus:outline-none"
                  >
                    <option value="">
                      Click a table in the hall, or pick one…
                    </option>
                    {tables.map((t) => {
                      const left = Math.max(0, t.capacity - t.occupiedSeats);
                      return (
                        <option
                          key={t.id}
                          value={t.id}
                          disabled={left < g.attending_count}
                        >
                          {t.name} ({left} left of {t.capacity})
                        </option>
                      );
                    })}
                  </select>
                )}
              </li>
            ))}
          </ul>
        )}
        {list.length > limit && (
          <button
            type="button"
            onClick={() => setLimit((n) => n + PAGE)}
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-hairline bg-white px-4 text-xs font-semibold text-night hover:bg-ivory focus-visible:outline-2 focus-visible:outline-burgundy"
          >
            Show {Math.min(PAGE, list.length - limit)} more of{" "}
            {list.length - limit}
          </button>
        )}
      </Section>
    </div>
  );
}
