"use client";

import React from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceAround,
  Copy,
  RotateCcw,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import type { TableShape, TableWithGuests } from "../types";
import {
  CHAIR_TYPES,
  ZONE_DEFAULTS,
  ZONE_COLOURS,
  styleOf,
  tableSizeLabel,
  type ChairType,
  type Centrepiece,
  type FreeChair,
  type HallLayout,
  type TableStyle,
  type Zone,
  type ZoneFinish,
  type ZoneShape,
} from "./model";
import {
  CentrepieceGlyph,
  ChairGlyph,
  MetreField,
  Section,
  ShapeGlyph,
  Stepper,
  Swatches,
  TableGlyph,
  Tiles,
} from "./studio-ui";
import { CENTREPIECES } from "./StudioPanels";

export type Align =
  | "left"
  | "centre-x"
  | "right"
  | "top"
  | "centre-y"
  | "bottom"
  | "space-x"
  | "space-y";

const iconBtn =
  "grid h-9 w-9 place-items-center rounded-lg text-night transition-colors hover:bg-[#f1ece4] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

function Header({
  kicker,
  title,
  onClose,
  onRotate,
  onDuplicate,
  onDelete,
}: {
  kicker: string;
  title: React.ReactNode;
  onClose: () => void;
  onRotate?: (d: number) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-hairline bg-white/95 px-4 pb-2 pt-3 backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-burgundy">
            {kicker}
          </p>
          <div className="truncate font-display text-lg font-bold leading-tight text-night">
            {title}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={iconBtn}
          aria-label="Close the inspector"
          title="Deselect (Esc)"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-1.5 flex gap-0.5">
        {onRotate && (
          <>
            <button
              type="button"
              className={iconBtn}
              onClick={() => onRotate(-15)}
              aria-label="Rotate left"
              title="Rotate left (Shift+R)"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              className={iconBtn}
              onClick={() => onRotate(15)}
              aria-label="Rotate right"
              title="Rotate right (R)"
            >
              <RotateCw size={16} />
            </button>
          </>
        )}
        {onDuplicate && (
          <button
            type="button"
            className={iconBtn}
            onClick={onDuplicate}
            aria-label="Duplicate"
            title="Duplicate (Ctrl+D)"
          >
            <Copy size={16} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className={`${iconBtn} hover:!bg-[#fbe9ea] hover:text-[#9e2a2b]`}
            onClick={onDelete}
            aria-label="Delete"
            title="Delete (Del)"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function Position({
  id,
  x,
  y,
  rot,
  layout,
  onMove,
  onRot,
}: {
  id: string;
  x: number;
  y: number;
  rot: number;
  layout: HallLayout;
  onMove: (x: number, y: number) => void;
  onRot: (deg: number) => void;
}) {
  return (
    <Section title="Position">
      <div className="grid grid-cols-3 gap-2">
        <MetreField
          id={`${id}-x`}
          label="From left"
          value={x}
          min={-5}
          max={layout.width + 5}
          onCommit={(v) => onMove(v, y)}
        />
        <MetreField
          id={`${id}-y`}
          label="From stage wall"
          value={y}
          min={-5}
          max={layout.length + 5}
          onCommit={(v) => onMove(x, v)}
        />
        <MetreField
          id={`${id}-r`}
          label="Turn"
          unit="°"
          value={Math.round(rot)}
          min={-360}
          max={360}
          onCommit={(v) => onRot(((v % 360) + 360) % 360)}
        />
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- table

export function TableInspector({
  table,
  layout,
  pos,
  rot,
  onClose,
  onRotate,
  onRot,
  onMove,
  onDuplicate,
  onDelete,
  onUpdate,
  onStyle,
  onStyleAll,
  onResetStyle,
  onUnseat,
}: {
  table: TableWithGuests;
  layout: HallLayout;
  pos: { x: number; y: number };
  rot: number;
  onClose: () => void;
  onRotate: (d: number) => void;
  onRot: (deg: number) => void;
  onMove: (x: number, y: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUpdate: (patch: {
    name?: string;
    capacity?: number;
    shape?: TableShape;
  }) => void;
  onStyle: (patch: TableStyle) => void;
  onStyleAll: () => void;
  onResetStyle: () => void;
  onUnseat: (guestId: string) => void;
}) {
  const st = styleOf(layout, table.id);
  const own = layout.tableStyles[table.id];
  const [name, setName] = React.useState(table.name);
  React.useEffect(() => setName(table.name), [table.name]);
  const commitName = () => {
    const v = name.trim().slice(0, 50);
    if (v && v !== table.name) onUpdate({ name: v });
    else setName(table.name);
  };
  return (
    <div data-testid="hall-inspector">
      <Header
        kicker={tableSizeLabel(table.shape, table.capacity)}
        title={table.name}
        onClose={onClose}
        onRotate={onRotate}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
      <Section title="Table">
        <label
          htmlFor="insp-name"
          className="text-[11px] font-semibold text-label-2"
        >
          Name
        </label>
        <input
          id="insp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === "Enter" && commitName()}
          className="mt-1 h-10 w-full rounded-lg border border-hairline bg-white px-2.5 text-base text-night outline-none focus:border-night sm:text-sm"
        />
        <div className="mt-3">
          <Tiles<TableShape>
            label="Table shape"
            cols={4}
            value={table.shape as TableShape}
            onPick={(v) => onUpdate({ shape: v })}
            options={(
              [
                ["round", "Round"],
                ["rectangular", "Banquet"],
                ["oval", "Oval"],
                ["head", "High table"],
              ] as const
            ).map(([k, l]) => ({
              key: k,
              label: l,
              icon: <TableGlyph shape={k} seats={table.capacity} size={28} />,
            }))}
          />
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
          <Stepper
            label="Seats"
            value={table.capacity}
            min={Math.max(1, table.occupiedSeats)}
            max={24}
            onChange={(v) => onUpdate({ capacity: v })}
          />
          <p className="text-right text-[11px] leading-tight text-label-2">
            {table.occupiedSeats} seated
            <br />
            {Math.max(0, table.capacity - table.occupiedSeats)} free
          </p>
        </div>
      </Section>
      <Position
        id="insp-t"
        x={pos.x}
        y={pos.y}
        rot={rot}
        layout={layout}
        onMove={onMove}
        onRot={onRot}
      />
      <Section
        title="Table cloth"
        aside={
          own ? (
            <button
              type="button"
              onClick={onResetStyle}
              className="text-[11px] font-semibold text-burgundy underline-offset-2 hover:underline"
            >
              Match the hall
            </button>
          ) : (
            <span className="text-[11px] text-label-2">Following the hall</span>
          )
        }
      >
        <Swatches
          label="Table cloth"
          value={st.cloth}
          onPick={(v) => v && onStyle({ cloth: v })}
        />
      </Section>
      <Section title="Chairs">
        <Tiles<ChairType>
          label="Chair type"
          value={st.chair}
          onPick={(v) => onStyle({ chair: v })}
          options={CHAIR_TYPES.map((c) => ({
            key: c.key,
            label: c.label,
            icon: <ChairGlyph type={c.key} />,
          }))}
        />
        {st.chair === "covered" && (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-semibold text-label-2">
              Chair cover
            </p>
            <Swatches
              label="Chair cover"
              value={st.cover}
              onPick={(v) => v && onStyle({ cover: v })}
            />
          </div>
        )}
        <p className="mb-1.5 mt-3 text-[11px] font-semibold text-label-2">
          Sash
        </p>
        <Swatches
          label="Chair sash"
          value={st.sash}
          allowNone
          onPick={(v) => onStyle({ sash: v })}
        />
      </Section>
      <Section title="Centrepiece">
        <Tiles<Centrepiece>
          label="Centrepiece"
          value={st.centrepiece}
          onPick={(v) => onStyle({ centrepiece: v })}
          options={CENTREPIECES.map((c) => ({
            ...c,
            icon: <CentrepieceGlyph kind={c.key} />,
          }))}
        />
        <p className="mb-1.5 mt-3 text-[11px] font-semibold text-label-2">
          Flowers
        </p>
        <Swatches
          label="Flowers"
          value={st.flower}
          onPick={(v) => v && onStyle({ flower: v })}
        />
        <button
          type="button"
          onClick={onStyleAll}
          className="mt-3 min-h-10 w-full rounded-full border border-hairline bg-white px-4 text-xs font-semibold text-night hover:border-night/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          Use this look on every table
        </button>
      </Section>
      <Section title={`Seated here (${table.guests.length})`}>
        {table.guests.length === 0 ? (
          <p className="text-xs text-label-2">
            Nobody yet. Pick a guest in Guests, then click this table.
          </p>
        ) : (
          <ul className="space-y-1">
            {table.guests.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-[#f6f1e8] px-2.5 py-1.5 text-xs text-night"
              >
                <span className="truncate">
                  {g.name}
                  {g.attending_count > 1 && (
                    <span className="text-label-2">
                      {" "}
                      +{g.attending_count - 1}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => onUnseat(g.id)}
                  className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold text-burgundy hover:bg-white"
                  aria-label={`Unseat ${g.name}`}
                >
                  Unseat
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- zone

const SHAPED: Zone["kind"][] = ["stage", "dance", "photo", "pillar", "cake"];
const FINISHES: Record<
  string,
  { key: ZoneFinish; label: string; c: string }[]
> = {
  dance: [
    {
      key: "gloss",
      label: "Black gloss",
      c: "linear-gradient(135deg,#2a272c,#0b0a0c 60%,#3a363d)",
    },
    {
      key: "white",
      label: "White gloss",
      c: "linear-gradient(135deg,#fff,#e9e6e0)",
    },
    {
      key: "led",
      label: "LED panels",
      c: "conic-gradient(#ff3d7f 0 25%,#00d1ff 0 50%,#ffb347 0 75%,#7c4dff 0)",
    },
    {
      key: "wood",
      label: "Parquet",
      c: "repeating-linear-gradient(45deg,#b07a45 0 4px,#9a6638 4px 8px)",
    },
    {
      key: "checker",
      label: "Checker",
      c: "conic-gradient(#111 0 25%,#f4f1ea 0 50%,#111 0 75%,#f4f1ea 0) 0 0/12px 12px",
    },
    {
      key: "marble",
      label: "Marble",
      c: "linear-gradient(135deg,#f3efe8,#d9d2c6)",
    },
  ],
  stage: [
    {
      key: "white",
      label: "White gloss",
      c: "linear-gradient(135deg,#fff,#e9e6e0)",
    },
    {
      key: "gloss",
      label: "Black gloss",
      c: "linear-gradient(135deg,#2a272c,#0b0a0c)",
    },
    { key: "carpet", label: "Carpet", c: "#6e1426" },
    {
      key: "wood",
      label: "Parquet",
      c: "repeating-linear-gradient(45deg,#b07a45 0 4px,#9a6638 4px 8px)",
    },
    {
      key: "marble",
      label: "Marble",
      c: "linear-gradient(135deg,#f3efe8,#d9d2c6)",
    },
    {
      key: "led",
      label: "LED",
      c: "conic-gradient(#ff3d7f 0 25%,#00d1ff 0 50%,#ffb347 0 75%,#7c4dff 0)",
    },
  ],
};
const COLOUR_LABEL: Partial<Record<Zone["kind"], string>> = {
  stage: "Stage skirt",
  entrance: "Runner",
  bar: "Bar light",
  buffet: "Table cloth",
  gifts: "Table cloth",
  cake: "Table cloth",
  photo: "Flower wall",
  pillar: "Pillar",
  dj: "Booth panel",
};

export function ZoneInspector({
  zone,
  layout,
  onClose,
  onChange,
  onRotate,
  onDuplicate,
  onDelete,
}: {
  zone: Zone;
  layout: HallLayout;
  onClose: () => void;
  onChange: (patch: Partial<Zone>) => void;
  onRotate: (d: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const shape = zone.shape ?? "rect";
  return (
    <div data-testid="hall-inspector">
      <Header
        kicker={ZONE_DEFAULTS[zone.kind].label}
        title={zone.label || ZONE_DEFAULTS[zone.kind].label}
        onClose={onClose}
        onRotate={onRotate}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
      <Section title="Name">
        <input
          aria-label="Area name"
          value={zone.label}
          onChange={(e) => onChange({ label: e.target.value.slice(0, 60) })}
          className="h-10 w-full rounded-lg border border-hairline bg-white px-2.5 text-base text-night outline-none focus:border-night sm:text-sm"
        />
      </Section>
      {SHAPED.includes(zone.kind) && (
        <Section title="Shape">
          <Tiles<ZoneShape>
            label="Shape"
            value={shape}
            onPick={(v) => {
              // Round shapes start as true circles; the size fields can stretch them after.
              const even =
                v === "round" ||
                v === "hexagon" ||
                v === "octagon" ||
                v === "heart";
              const s = Math.max(zone.w, zone.h);
              onChange(
                even
                  ? {
                      shape: v,
                      w: s,
                      h: zone.kind === "stage" && v === "heart" ? s * 0.9 : s,
                    }
                  : { shape: v }
              );
            }}
            options={(
              [
                ["rect", "Rectangle"],
                ["round", "Round"],
                ["oval", "Oval"],
                ["hexagon", "Hexagon"],
                ["octagon", "Octagon"],
                ["heart", "Heart"],
              ] as const
            ).map(([k, l]) => ({
              key: k,
              label: l,
              icon: <ShapeGlyph shape={k} />,
            }))}
          />
        </Section>
      )}
      <Section title="Size & position">
        <div className="grid grid-cols-2 gap-2">
          <MetreField
            id="zone-w"
            label="Width"
            value={zone.w}
            min={0.4}
            max={60}
            onCommit={(v) => onChange({ w: v })}
          />
          <MetreField
            id="zone-h"
            label="Depth"
            value={zone.h}
            min={0.4}
            max={60}
            onCommit={(v) => onChange({ h: v })}
          />
          <MetreField
            id="zone-x"
            label="From left"
            value={zone.x}
            min={-5}
            max={layout.width + 5}
            onCommit={(v) => onChange({ x: v })}
          />
          <MetreField
            id="zone-y"
            label="From stage wall"
            value={zone.y}
            min={-5}
            max={layout.length + 5}
            onCommit={(v) => onChange({ y: v })}
          />
          <MetreField
            id="zone-r"
            label="Turn"
            unit="°"
            value={Math.round(zone.rot ?? 0)}
            min={-360}
            max={360}
            onCommit={(v) => onChange({ rot: ((v % 360) + 360) % 360 })}
          />
          {zone.kind === "stage" && (
            <MetreField
              id="zone-height"
              label="Height"
              value={zone.height ?? 0.8}
              min={0.1}
              max={2}
              onCommit={(v) => onChange({ height: v })}
            />
          )}
        </div>
      </Section>
      {FINISHES[zone.kind] && (
        <Section title="Surface">
          <Tiles<ZoneFinish>
            label="Surface"
            value={zone.finish ?? (zone.kind === "stage" ? "white" : "gloss")}
            onPick={(v) => onChange({ finish: v })}
            options={FINISHES[zone.kind].map((f) => ({
              key: f.key,
              label: f.label,
              icon: (
                <span
                  className="block h-6 w-9 rounded-md ring-1 ring-black/10"
                  style={{ background: f.c }}
                />
              ),
            }))}
          />
        </Section>
      )}
      {COLOUR_LABEL[zone.kind] && (
        <Section title={COLOUR_LABEL[zone.kind] as string}>
          <Swatches
            label={COLOUR_LABEL[zone.kind] as string}
            value={zone.color ?? ZONE_COLOURS[zone.kind]}
            onPick={(v) => v && onChange({ color: v })}
          />
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- free chair

export function ChairInspector({
  chair,
  layout,
  onClose,
  onChange,
  onRotate,
  onDuplicate,
  onDelete,
}: {
  chair: FreeChair;
  layout: HallLayout;
  onClose: () => void;
  onChange: (patch: Partial<FreeChair>) => void;
  onRotate: (d: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div data-testid="hall-inspector">
      <Header
        kicker="Chair"
        title="Single chair"
        onClose={onClose}
        onRotate={onRotate}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
      <Section title="Chair type">
        <Tiles<ChairType>
          label="Chair type"
          value={chair.chair ?? layout.decor.chair}
          onPick={(v) => onChange({ chair: v })}
          options={CHAIR_TYPES.map((c) => ({
            key: c.key,
            label: c.label,
            icon: <ChairGlyph type={c.key} />,
          }))}
        />
      </Section>
      <Position
        id="insp-c"
        x={chair.x}
        y={chair.y}
        rot={chair.rot}
        layout={layout}
        onMove={(x, y) => onChange({ x, y })}
        onRot={(rot) => onChange({ rot })}
      />
    </div>
  );
}

// ---------------------------------------------------------------- many

export function MultiInspector({
  count,
  tables,
  onClose,
  onAlign,
  onDelete,
  onStyle,
}: {
  count: number;
  tables: number;
  onClose: () => void;
  onAlign: (a: Align) => void;
  onDelete: () => void;
  onStyle: (patch: TableStyle) => void;
}) {
  const align: [Align, string, React.ElementType][] = [
    ["left", "Align left", AlignStartVertical],
    ["centre-x", "Align centres across", AlignCenterVertical],
    ["right", "Align right", AlignEndVertical],
    ["top", "Align to the stage side", AlignStartHorizontal],
    ["centre-y", "Align middles", AlignCenterHorizontal],
    ["bottom", "Align to the entrance side", AlignEndHorizontal],
    ["space-x", "Space evenly across", AlignHorizontalSpaceAround],
    ["space-y", "Space evenly down", AlignVerticalSpaceAround],
  ];
  return (
    <div data-testid="hall-inspector">
      <Header
        kicker="Selection"
        title={`${count} items`}
        onClose={onClose}
        onDelete={onDelete}
      />
      <Section title="Line them up">
        <div className="grid grid-cols-4 gap-1">
          {align.map(([k, label, I]) => (
            <button
              key={k}
              type="button"
              onClick={() => onAlign(k)}
              aria-label={label}
              title={label}
              className={`${iconBtn} h-10 w-full border border-hairline bg-white`}
            >
              <I size={17} />
            </button>
          ))}
        </div>
      </Section>
      {tables > 0 && (
        <>
          <Section
            title={`Cloth for ${tables} ${tables === 1 ? "table" : "tables"}`}
          >
            <Swatches
              label="Table cloth"
              value={null}
              onPick={(v) => v && onStyle({ cloth: v })}
            />
          </Section>
          <Section title="Chairs">
            <Tiles<ChairType>
              label="Chair type"
              value={undefined}
              onPick={(v) => onStyle({ chair: v })}
              options={CHAIR_TYPES.map((c) => ({
                key: c.key,
                label: c.label,
                icon: <ChairGlyph type={c.key} />,
              }))}
            />
            <p className="mb-1.5 mt-3 text-[11px] font-semibold text-label-2">
              Sash
            </p>
            <Swatches
              label="Chair sash"
              value={null}
              onPick={(v) => onStyle({ sash: v })}
            />
          </Section>
          <Section title="Centrepiece">
            <Tiles<Centrepiece>
              label="Centrepiece"
              value={undefined}
              onPick={(v) => onStyle({ centrepiece: v })}
              options={CENTREPIECES.map((c) => ({
                ...c,
                icon: <CentrepieceGlyph kind={c.key} />,
              }))}
            />
          </Section>
        </>
      )}
    </div>
  );
}
