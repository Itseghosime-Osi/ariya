"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  Armchair,
  Box,
  ChevronDown,
  ChevronRight,
  Layers,
  Pencil,
  Plus,
  Search,
  Shapes,
  Table2,
  UserMinus,
  Users,
  Wind,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeatingGuest, TableWithGuests } from "../types";
import type { Pick as HallPick } from "./Hall3D";
import {
  buildLayers,
  filterLayers,
  type LayerKind,
  type LayerRow,
} from "./layers";
import type { HallLayout } from "./model";

/**
 * The left dock of the seating workspace: every object in the hall as a named, renamable layer, and
 * every table as a place guests can be seated at. It does not own any state of the hall; it reads
 * the layout and the seating data and hands every change back.
 */

type Tab = "layers" | "tables";

const KIND_ICON: Record<LayerKind, typeof Box> = {
  table: Table2,
  zone: Shapes,
  chair: Armchair,
  stageItem: Box,
  ac: Wind,
};

export interface LeftDockProps {
  layout: HallLayout;
  tables: TableWithGuests[];
  unseated: SeatingGuest[];
  selection: HallPick[];
  /** Pick a layer in the hall; `additive` is a held Shift or Ctrl. */
  onSelect: (picks: HallPick[], additive: boolean) => void;
  onRenameTable: (id: string, name: string) => void;
  onRenameLayer: (row: LayerRow, name: string) => void;
  onAssign: (guestId: string, tableId: string | null) => void;
  onNewTable: () => void;
  /** Opens the Seat deck, where the engine seats everyone in one go. */
  onAutoSeat: () => void;
  stats: {
    seatedAttendees: number;
    unseatedAttendees: number;
    readinessPct: number;
  };
  /** The hall's live numbers (guests, seats, what fits), shown above the tabs. */
  meter?: ReactNode;
  /** The layer under the pointer or keyboard focus, as a hall key like `table:id`, or null. */
  onHover?: (key: string | null) => void;
  onClose: () => void;
}

export function LeftDock({
  layout,
  tables,
  unseated,
  selection,
  onSelect,
  onRenameTable,
  onRenameLayer,
  onAssign,
  onNewTable,
  onAutoSeat,
  stats,
  meter,
  onHover,
  onClose,
}: LeftDockProps) {
  const [tab, setTab] = useState<Tab>("layers");
  // Remember which tab the host works in; read after mount so the server's markup still matches.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ariya:hall-dock-tab");
      if (saved === "layers" || saved === "tables") setTab(saved);
    } catch {
      /* no storage */
    }
  }, []);
  const chooseTab = (next: Tab) => {
    setTab(next);
    try {
      localStorage.setItem("ariya:hall-dock-tab", next);
    } catch {
      /* not remembered */
    }
  };
  const tabs: { key: Tab; label: string; icon: typeof Box; count: number }[] = [
    {
      key: "layers",
      label: "Layers",
      icon: Layers,
      count:
        layout.zones.length +
        layout.stageItems.length +
        layout.chairs.length +
        tables.length,
    },
    { key: "tables", label: "Tables", icon: Table2, count: tables.length },
  ];

  return (
    <section
      aria-label="Layers and tables"
      data-testid="left-dock"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-hairline bg-[#fbf9f5] shadow-[0_20px_50px_-24px_rgba(28,7,13,0.45)]"
    >
      {meter && (
        <div className="border-b border-hairline px-4 py-3">{meter}</div>
      )}
      <div className="flex items-center gap-1 border-b border-hairline p-2">
        <div
          role="tablist"
          aria-label="Layers or tables"
          className="grid flex-1 grid-cols-2 gap-1 rounded-full bg-[#f1ece4] p-1"
        >
          {tabs.map(({ key, label, icon: I, count }) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`dock-tab-${key}`}
              aria-selected={tab === key}
              aria-controls="dock-panel"
              onClick={() => chooseTab(key)}
              className={cn(
                "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
                tab === key
                  ? "bg-night text-white shadow-sm"
                  : "text-night hover:bg-white"
              )}
            >
              <I size={14} aria-hidden="true" />
              {label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] tabular-nums",
                  tab === key ? "bg-white/15" : "bg-white text-label-2"
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the left dock"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-night hover:bg-[#f1ece4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <X size={16} />
        </button>
      </div>

      <div
        id="dock-panel"
        role="tabpanel"
        aria-labelledby={`dock-tab-${tab}`}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {tab === "layers" ? (
          <LayersTab
            layout={layout}
            tables={tables}
            selection={selection}
            onSelect={onSelect}
            onRenameTable={onRenameTable}
            onRenameLayer={onRenameLayer}
            onHover={onHover}
          />
        ) : (
          <TablesTab
            tables={tables}
            unseated={unseated}
            selection={selection}
            onSelect={onSelect}
            onRenameTable={onRenameTable}
            onAssign={onAssign}
            onNewTable={onNewTable}
            onAutoSeat={onAutoSeat}
            stats={stats}
            onHover={onHover}
          />
        )}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- layers */

function LayersTab({
  layout,
  tables,
  selection,
  onSelect,
  onRenameTable,
  onRenameLayer,
  onHover,
}: Pick<
  LeftDockProps,
  | "layout"
  | "tables"
  | "selection"
  | "onSelect"
  | "onRenameTable"
  | "onRenameLayer"
  | "onHover"
>) {
  const [query, setQuery] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);

  const groups = useMemo(
    () => filterLayers(buildLayers(layout, tables), query),
    [layout, tables, query]
  );
  const selected = useMemo(
    () => new Set(selection.map((p) => `${p.type}:${p.id}`)),
    [selection]
  );

  const commit = (row: LayerRow, name: string) => {
    setEditing(null);
    if (row.kind === "table") {
      const clean = name.replace(/\s+/g, " ").trim();
      // A table cannot be left without a name; an empty entry keeps the one it has.
      if (clean && clean !== row.name) onRenameTable(row.id, clean);
      return;
    }
    if (name.trim() !== row.name) onRenameLayer(row, name);
  };

  // Arrow keys walk the rows, Home and End jump to the ends: a long list is never a mouse-only job.
  const walk = (e: ReactKeyboardEvent) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const rows = Array.from(
      list.current?.querySelectorAll<HTMLElement>("[data-layer-row]") ?? []
    );
    if (rows.length === 0) return;
    const at = rows.indexOf(document.activeElement as HTMLElement);
    if (at < 0 && (e.target as HTMLElement).tagName === "INPUT") return;
    e.preventDefault();
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? rows.length - 1
          : Math.max(
              0,
              Math.min(rows.length - 1, at + (e.key === "ArrowDown" ? 1 : -1))
            );
    rows[next]?.focus();
  };

  return (
    <div className="p-2" ref={list} onKeyDown={walk}>
      <label className="relative block">
        <span className="sr-only">Search layers</span>
        <Search
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-label-2"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search layers"
          className="min-h-10 w-full rounded-full border border-hairline bg-white pl-9 pr-3 text-xs text-night placeholder:text-label-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        />
      </label>

      {groups.length === 0 && (
        <p className="px-2 py-8 text-center text-xs text-label-2">
          {query ? "No layer has that name." : "Nothing in the hall yet."}
        </p>
      )}

      {groups.map((g) => {
        const isFolded = folded[g.key] && !query;
        return (
          <section key={g.key} className="mt-3" aria-label={g.label}>
            <button
              type="button"
              aria-expanded={!isFolded}
              onClick={() => setFolded((f) => ({ ...f, [g.key]: !f[g.key] }))}
              className="flex min-h-9 w-full items-center gap-1.5 rounded-lg px-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-label-2 hover:text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              {isFolded ? (
                <ChevronRight size={13} aria-hidden="true" />
              ) : (
                <ChevronDown size={13} aria-hidden="true" />
              )}
              {g.label}
              <span className="font-normal tabular-nums">{g.rows.length}</span>
            </button>
            {!isFolded && (
              <ul className="mt-0.5 space-y-0.5">
                {g.rows.map((row) => (
                  <LayerItem
                    key={row.key}
                    row={row}
                    selected={selected.has(
                      `${row.kind === "stageItem" ? "zone" : row.kind}:${
                        row.kind === "stageItem" ? row.stageId : row.id
                      }`
                    )}
                    editing={editing === row.key}
                    onHover={onHover}
                    onEdit={() => setEditing(row.key)}
                    onCancel={() => setEditing(null)}
                    onCommit={(name) => commit(row, name)}
                    onPick={(additive) =>
                      onSelect(
                        [
                          {
                            // A fixture is part of its stage: picking it picks the stage.
                            type:
                              row.kind === "stageItem"
                                ? "zone"
                                : (row.kind as HallPick["type"]),
                            id:
                              row.kind === "stageItem"
                                ? (row.stageId as string)
                                : row.id,
                          },
                        ],
                        additive
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
      <p className="px-2 pb-3 pt-4 text-[11px] leading-snug text-label-2">
        Click a layer to select it in the hall. Double-click, or use the pencil,
        to rename it.
      </p>
    </div>
  );
}

function LayerItem({
  row,
  selected,
  editing,
  onHover,
  onEdit,
  onCancel,
  onCommit,
  onPick,
}: {
  row: LayerRow;
  selected: boolean;
  editing: boolean;
  onHover?: (key: string | null) => void;
  onEdit: () => void;
  onCancel: () => void;
  onCommit: (name: string) => void;
  onPick: (additive: boolean) => void;
}) {
  const I = KIND_ICON[row.kind];
  // A fixture is part of its stage, so pointing at it lights up the stage.
  const hallKey =
    row.kind === "stageItem" ? `zone:${row.stageId}` : `${row.kind}:${row.id}`;
  const [draft, setDraft] = useState(row.name);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!editing) return;
    setDraft(row.name);
    // Select the whole name so typing replaces it, the way every design tool behaves.
    requestAnimationFrame(() => input.current?.select());
  }, [editing]);

  return (
    <li>
      <div
        onMouseEnter={() => onHover?.(hallKey)}
        onMouseLeave={() => onHover?.(null)}
        onFocus={() => onHover?.(hallKey)}
        onBlur={() => onHover?.(null)}
        className={cn(
          "flex items-center gap-1 rounded-xl pl-2 pr-1 transition-colors",
          row.kind === "stageItem" && "ml-5",
          selected ? "bg-night text-white" : "text-night hover:bg-white"
        )}
      >
        {editing ? (
          <>
            <I size={15} aria-hidden="true" className="shrink-0 opacity-70" />
            <input
              ref={input}
              value={draft}
              maxLength={60}
              aria-label={`Name of ${row.name}`}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => onCommit(draft)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCommit(draft);
                if (e.key === "Escape") {
                  e.preventDefault();
                  onCancel();
                }
                e.stopPropagation();
              }}
              className="my-1 min-h-9 min-w-0 flex-1 rounded-lg border border-burgundy bg-white px-2 text-sm font-semibold text-night focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
            />
          </>
        ) : (
          <>
            <button
              type="button"
              aria-pressed={selected}
              data-layer-row
              onClick={(e) => onPick(e.shiftKey || e.metaKey || e.ctrlKey)}
              onDoubleClick={() => row.renamable && onEdit()}
              onKeyDown={(e) => {
                // F2 renames, as it does in every file manager and design tool.
                if (e.key === "F2" && row.renamable) {
                  e.preventDefault();
                  onEdit();
                }
              }}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
            >
              <I size={15} aria-hidden="true" className="shrink-0 opacity-70" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold leading-tight">
                  {row.name}
                </span>
                {row.detail && (
                  <span
                    className={cn(
                      "block truncate text-[11px] leading-tight",
                      selected ? "text-white/80" : "text-label-2"
                    )}
                  >
                    {row.detail}
                  </span>
                )}
              </span>
            </button>
            {row.renamable && (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Rename ${row.name}`}
                title="Rename"
                className={cn(
                  "grid h-11 w-9 shrink-0 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy",
                  selected
                    ? "text-white/80 hover:text-white"
                    : "text-label-2 hover:text-night"
                )}
              >
                <Pencil size={13} />
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

/* ----------------------------------------------------------------- tables */

function TablesTab({
  tables,
  unseated,
  selection,
  onSelect,
  onRenameTable,
  onAssign,
  onNewTable,
  onAutoSeat,
  stats,
  onHover,
}: Pick<
  LeftDockProps,
  | "tables"
  | "unseated"
  | "selection"
  | "onSelect"
  | "onRenameTable"
  | "onAssign"
  | "onNewTable"
  | "onAutoSeat"
  | "stats"
  | "onHover"
>) {
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const picked = new Set(
    selection.filter((p) => p.type === "table").map((p) => p.id)
  );

  const shown = tables.filter(
    (t) =>
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.guests.some((g) => g.name.toLowerCase().includes(q))
  );
  const waiting = unseated.filter(
    (g) => !q || g.name.toLowerCase().includes(q)
  );
  const total = stats.seatedAttendees + stats.unseatedAttendees;

  return (
    <div className="p-2">
      <div className="rounded-2xl border border-hairline bg-white p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-night">
            {stats.seatedAttendees} of {total} guests seated
          </p>
          <p className="text-xs font-bold tabular-nums text-burgundy">
            {stats.readinessPct}%
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Guests seated"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={stats.readinessPct}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f1ece4]"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#d4a85a] to-burgundy transition-[width] duration-500"
            style={{ width: `${stats.readinessPct}%` }}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onNewTable}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-burgundy px-3 text-xs font-semibold text-ivory hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Plus size={14} aria-hidden="true" /> New table
          </button>
          <button
            type="button"
            onClick={onAutoSeat}
            disabled={stats.unseatedAttendees === 0}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-hairline bg-white px-3 text-xs font-semibold text-night hover:border-night/40 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Users size={14} aria-hidden="true" /> Auto-seat
          </button>
        </div>
      </div>

      <label className="relative mt-2 block">
        <span className="sr-only">Search tables and guests</span>
        <Search
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-label-2"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tables or guests"
          className="min-h-10 w-full rounded-full border border-hairline bg-white pl-9 pr-3 text-xs text-night placeholder:text-label-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        />
      </label>

      {tables.length === 0 && (
        <p className="px-2 py-8 text-center text-xs text-label-2">
          No tables yet. Add one and seat your guests at it from here.
        </p>
      )}

      <ul className="mt-2 space-y-1.5">
        {shown.map((t) => {
          const free = Math.max(0, t.capacity - t.occupiedSeats);
          const full = free === 0;
          const isOpen = open === t.id || (!!q && shown.length <= 3);
          const pct = Math.min(
            100,
            Math.round((t.occupiedSeats / Math.max(1, t.capacity)) * 100)
          );
          return (
            <li
              key={t.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-white transition-colors",
                picked.has(t.id) ? "border-burgundy" : "border-hairline"
              )}
            >
              <div
                className="flex items-center"
                onMouseEnter={() => onHover?.(`table:${t.id}`)}
                onMouseLeave={() => onHover?.(null)}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => {
                    setOpen(isOpen ? null : t.id);
                    onSelect([{ type: "table", id: t.id }], false);
                  }}
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burgundy"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-night">
                      {t.name}
                    </span>
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[#f1ece4]">
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          full ? "bg-[#1f6b4a]" : "bg-[#d4a85a]"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold tabular-nums text-night">
                      {t.occupiedSeats}/{t.capacity}
                    </span>
                    <span
                      className={cn(
                        "block text-[10px]",
                        full ? "text-[#1f6b4a]" : "text-label-2"
                      )}
                    >
                      {full ? "Full" : `${free} free`}
                    </span>
                  </span>
                  <ChevronDown
                    size={15}
                    aria-hidden="true"
                    className={cn(
                      "shrink-0 text-label-2 transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-hairline bg-[#fbf9f5] px-3 py-2">
                  {t.guests.length === 0 ? (
                    <p className="py-1 text-xs text-label-2">
                      Nobody here yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-hairline">
                      {t.guests.map((g) => (
                        <li
                          key={g.id}
                          className="flex items-center gap-2 py-0.5"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm text-night">
                            {g.name}
                            {g.attending_count > 1 && (
                              <span className="ml-1.5 rounded-full bg-[#f3ead8] px-1.5 text-[11px] font-semibold text-[#5c4013]">
                                +{g.attending_count - 1}
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => onAssign(g.id, null)}
                            aria-label={`Take ${g.name} off ${t.name}`}
                            title="Take off this table"
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-label-2 hover:bg-[#f1ece4] hover:text-[#9e2a2b] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
                          >
                            <UserMinus size={15} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <label className="mt-1 block">
                    <span className="sr-only">Seat a guest at {t.name}</span>
                    <select
                      value=""
                      disabled={full || unseated.length === 0}
                      onChange={(e) =>
                        e.target.value && onAssign(e.target.value, t.id)
                      }
                      className="min-h-11 w-full rounded-full border border-hairline bg-white px-3 text-xs font-semibold text-night disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                    >
                      <option value="">
                        {full
                          ? "This table is full"
                          : unseated.length === 0
                            ? "Everyone is seated"
                            : "Add a guest to this table…"}
                      </option>
                      {unseated.map((g) => (
                        <option
                          key={g.id}
                          value={g.id}
                          disabled={g.attending_count > free}
                        >
                          {g.name}
                          {g.attending_count > 1
                            ? ` (party of ${g.attending_count})`
                            : ""}
                          {g.attending_count > free ? " — too many" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <RenameTable
                    name={t.name}
                    onRename={(name) => onRenameTable(t.id, name)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {waiting.length > 0 && (
        <section className="mt-4" aria-label="Waiting for a seat">
          <h2 className="px-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-label-2">
            Waiting for a seat{" "}
            <span className="font-normal tabular-nums">{waiting.length}</span>
          </h2>
          <ul className="mt-1 space-y-1">
            {waiting.map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-2 rounded-xl border border-hairline bg-white py-1 pl-3 pr-1"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-night">
                    {g.name}
                    {g.attending_count > 1 && (
                      <span className="ml-1.5 rounded-full bg-[#f3ead8] px-1.5 text-[11px] font-semibold text-[#5c4013]">
                        +{g.attending_count - 1}
                      </span>
                    )}
                  </span>
                  {g.seating_conflict_at && (
                    <span className="block text-[11px] text-[#9e2a2b]">
                      Party size changed
                    </span>
                  )}
                </span>
                <select
                  value=""
                  aria-label={`Seat ${g.name} at`}
                  disabled={tables.length === 0}
                  onChange={(e) =>
                    e.target.value && onAssign(g.id, e.target.value)
                  }
                  className="min-h-11 max-w-[8.5rem] rounded-full border border-hairline bg-[#fbf9f5] px-2 text-xs font-semibold text-night disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                >
                  <option value="">Seat at…</option>
                  {tables.map((t) => {
                    const free = t.capacity - t.occupiedSeats;
                    return (
                      <option
                        key={t.id}
                        value={t.id}
                        disabled={g.attending_count > free}
                      >
                        {t.name} ({Math.max(0, free)} free)
                      </option>
                    );
                  })}
                </select>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function RenameTable({
  name,
  onRename,
}: {
  name: string;
  onRename: (name: string) => void;
}) {
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  const save = () => {
    const clean = draft.replace(/\s+/g, " ").trim();
    if (clean && clean !== name) onRename(clean);
    else setDraft(name);
  };
  return (
    <label className="mt-2 flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-label-2">
        Name
      </span>
      <input
        value={draft}
        maxLength={60}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          e.stopPropagation();
        }}
        className="min-h-10 min-w-0 flex-1 rounded-full border border-hairline bg-white px-3 text-xs font-semibold text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      />
    </label>
  );
}
