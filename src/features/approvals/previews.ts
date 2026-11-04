import { checkHallPlacement } from "@/features/seating/hall/checks";
import {
  formatMetres,
  type HallLayout,
  type Zone,
} from "@/features/seating/hall/model";
import {
  selectApplicableAssignments,
  type PlanAssignment,
  type PlanGuest,
  type PlanTable,
} from "@/features/seating/plan-checks";
import {
  hallPayloadSchema,
  seatingPayloadSchema,
  type HallPayload,
  type SeatingPayload,
} from "./schemas";
import type {
  HallPreview,
  PreviewTable,
  ProposalKind,
  ProposalPreview,
  SeatingPreview,
  SeatingPreviewTable,
} from "./types";

/**
 * What a pending proposal would actually do, worked out from the celebration as it stands right
 * now. Pure, and used by the card only: applying re-checks everything again in `actions.ts`, so the
 * preview can never be the thing that decides what is written.
 *
 * The point is a person who does not know the hall designer. Every sentence here is about what they
 * will see in the room, not about the document that describes it.
 */

/** A table on the plan, with the position the proposal gives it. */
export interface PreviewTableInput {
  id: string;
  name: string;
  capacity: number;
  shape: string;
  /** Today's position, in centimetres. */
  x: number;
  y: number;
}

function placed(
  tables: PreviewTableInput[],
  positions: { id: string; x: number; y: number }[] | undefined
): PreviewTable[] {
  const byId = new Map((positions ?? []).map((p) => [p.id, p]));

  return tables.map((table) => {
    const position = byId.get(table.id);
    return {
      id: table.id,
      name: table.name,
      capacity: table.capacity,
      shape: table.shape,
      x: position?.x ?? table.x,
      y: position?.y ?? table.y,
    };
  });
}

/** Everything a preview needs to know about one celebration. */
export interface PreviewContext {
  layout: HallLayout | null;
  tables: PreviewTableInput[];
  guests: PlanGuest[];
}

/**
 * The single way a stored payload becomes a preview. Null means the payload cannot be read as the
 * kind it claims to be — a state the card shows on purpose, because a change the desk cannot
 * picture is one a host must not be asked to approve.
 */
export function previewFromStored(
  kind: ProposalKind,
  stored: unknown,
  context: PreviewContext
): ProposalPreview | null {
  if (kind === "apply_hall_layout") {
    const payload = hallPayloadSchema.safeParse(stored);
    if (!payload.success) return null;

    return buildHallPreview({
      payload: payload.data,
      currentLayout: context.layout,
      tables: context.tables,
    });
  }

  if (kind !== "apply_seating_plan") return null;

  const payload = seatingPayloadSchema.safeParse(stored);
  if (!payload.success) return null;

  return buildSeatingPreview({
    payload: payload.data,
    guests: context.guests,
    tables: context.tables,
  });
}

export function buildHallPreview(input: {
  payload: HallPayload;
  currentLayout: HallLayout | null;
  tables: PreviewTableInput[];
}): HallPreview {
  const proposedTables = placed(input.tables, input.payload.tablePositions);
  const currentTables = placed(input.tables, undefined);

  return {
    kind: "hall",
    proposed: { layout: input.payload.layout, tables: proposedTables },
    current: { layout: input.currentLayout, tables: currentTables },
    changes: hallChanges(
      input.currentLayout,
      input.payload.layout,
      currentTables,
      proposedTables
    ),
    problems: checkHallPlacement({
      layout: input.payload.layout,
      tables: input.tables,
      /*
        The plan's own positions as well as the ones we can place, so a table it names that this
        celebration no longer has is reported rather than quietly dropped.
      */
      positions: {
        ...Object.fromEntries(
          proposedTables.map((table) => [table.id, { x: table.x, y: table.y }])
        ),
        ...Object.fromEntries(
          (input.payload.tablePositions ?? []).map((position) => [
            position.id,
            { x: position.x, y: position.y },
          ])
        ),
      },
      rotations: input.payload.layout.rotations,
    }),
  };
}

/**
 * The differences a host would notice, in the order they would notice them: the room itself, what
 * is in it, how it is dressed, and finally which tables stood up and moved.
 */
function hallChanges(
  before: HallLayout | null,
  after: HallLayout,
  beforeTables: PreviewTable[],
  afterTables: PreviewTable[]
): string[] {
  const changes: string[] = [];

  if (!before) {
    changes.push(
      `This celebration has no saved room yet, so this plan would create one: ${formatMetres(after.width)} × ${formatMetres(after.length)}.`
    );
  } else {
    if (before.width !== after.width || before.length !== after.length) {
      changes.push(
        `The room changes from ${formatMetres(before.width)} × ${formatMetres(before.length)} to ${formatMetres(after.width)} × ${formatMetres(after.length)}.`
      );
    }
    if (before.spacing !== after.spacing) {
      changes.push(
        `Tables are set to ${after.spacing} spacing instead of ${before.spacing}.`
      );
    }
  }

  changes.push(...zoneChanges(before?.zones ?? [], after.zones));
  changes.push(...dressChanges(before, after));
  changes.push(...tableChanges(beforeTables, afterTables));

  if (changes.length === 0) {
    changes.push("The room is the same as the one you have now.");
  }

  return changes;
}

/** Zones are named by the zone itself, never by text the app chose to put in the label. */
function zoneChanges(before: Zone[], after: Zone[]): string[] {
  const changes: string[] = [];
  const oldById = new Map(before.map((zone) => [zone.id, zone]));

  for (const zone of after) {
    const previous = oldById.get(zone.id);
    if (!previous) {
      changes.push(
        `Adds ${article(zoneName(zone))} ${zoneName(zone)} (${size(zone)}).`
      );
      continue;
    }
    oldById.delete(zone.id);

    if (previous.kind !== zone.kind) {
      changes.push(
        `The ${zoneName(previous)} becomes ${article(zoneName(zone))} ${zoneName(zone)}.`
      );
      continue;
    }
    if (moved(previous, zone)) {
      changes.push(`The ${zoneName(zone)} moves.`);
    } else if (resized(previous, zone)) {
      changes.push(`The ${zoneName(zone)} becomes ${size(zone)}.`);
    }
  }

  for (const zone of oldById.values()) {
    changes.push(`Removes the ${zoneName(zone)}.`);
  }

  return changes;
}

/** What a person calls a zone: its kind, which is the only part of a zone we ever trusted. */
function zoneName(zone: Zone): string {
  return zone.kind === "dance" ? "dance floor" : zone.kind;
}

function moved(a: Zone, b: Zone): boolean {
  return Math.abs(a.x - b.x) > 0.2 || Math.abs(a.y - b.y) > 0.2;
}

function resized(a: Zone, b: Zone): boolean {
  return Math.abs(a.w - b.w) > 0.2 || Math.abs(a.h - b.h) > 0.2;
}

function size(zone: Zone): string {
  return `${formatMetres(zone.w)} × ${formatMetres(zone.h)}`;
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

/** What the room is dressed in: only what can be said in words, never a hex code. */
function dressChanges(before: HallLayout | null, after: HallLayout): string[] {
  if (!before) return [];

  const changes: string[] = [];
  const old = before.decor;
  const next = after.decor;

  if (old.chair !== next.chair) {
    changes.push(`Chairs change from ${old.chair} to ${next.chair}.`);
  }
  if (old.centrepiece !== next.centrepiece) {
    changes.push(
      next.centrepiece === "none"
        ? "Centrepieces are removed."
        : `Centrepieces change to ${next.centrepiece}.`
    );
  }
  if (old.floor !== next.floor) {
    changes.push(`The floor changes from ${old.floor} to ${next.floor}.`);
  }
  if (
    old.linen !== next.linen ||
    old.sash !== next.sash ||
    old.wall !== next.wall
  ) {
    changes.push("The colours of the linen, sashes or walls change.");
  }
  if (before.mood !== after.mood) {
    changes.push(
      after.mood === "evening"
        ? "The room is set for the evening."
        : "The room is set for daytime."
    );
  }
  if (before.ceiling !== after.ceiling) {
    changes.push(
      `The ceiling height changes from ${formatMetres(before.ceiling)} to ${formatMetres(after.ceiling)}.`
    );
  }

  return changes;
}

/** How many tables move, and how far the furthest one goes. */
function tableChanges(before: PreviewTable[], after: PreviewTable[]): string[] {
  const old = new Map(before.map((table) => [table.id, table]));
  let movedCount = 0;
  let furthest = 0;

  for (const table of after) {
    const previous = old.get(table.id);
    if (!previous) continue;
    const distance = Math.hypot(table.x - previous.x, table.y - previous.y);
    if (distance >= 10) {
      movedCount++;
      furthest = Math.max(furthest, distance);
    }
  }

  if (movedCount === 0) return [];

  const tables = `${movedCount} ${movedCount === 1 ? "table" : "tables"}`;
  return [
    `${tables} ${movedCount === 1 ? "moves" : "move"} on the floor plan, the furthest by ${formatMetres(furthest / 100)}.`,
  ];
}

/**
 * Who would sit where once the plan is applied, worked out with the same selection the apply uses,
 * so the card cannot promise a guest a seat the apply would skip.
 */
export function buildSeatingPreview(input: {
  payload: SeatingPayload;
  guests: PlanGuest[];
  tables: PlanTable[];
}): SeatingPreview {
  const mode = input.payload.mode ?? "fill_unseated";
  const assignments: PlanAssignment[] = input.payload.assignments;
  const { applicable, skipped } = selectApplicableAssignments({
    assignments,
    guests: input.guests,
    tables: input.tables,
    mode,
  });

  const guestById = new Map(input.guests.map((guest) => [guest.id, guest]));
  const tableById = new Map(input.tables.map((table) => [table.id, table]));
  const tableName = (id: string | null) =>
    id
      ? (tableById.get(id)?.name ?? "a table that no longer exists")
      : "no table";

  // Everyone's table after the plan, so a table's list is exactly what would be true afterwards.
  const after = new Map<string, string | null>(
    input.guests.map((guest) => [guest.id, guest.tableId])
  );
  for (const assignment of applicable) {
    after.set(assignment.guestId, assignment.tableId);
  }

  const tables: SeatingPreviewTable[] = input.tables.map((table) => ({
    id: table.id,
    name: table.name,
    capacity: table.capacity,
    occupied: 0,
    guests: [],
  }));
  const byId = new Map(tables.map((table) => [table.id, table]));

  let seatedCount = 0;
  let movedCount = 0;
  let unchangedCount = 0;
  const moves: SeatingPreview["moves"] = [];

  for (const guest of input.guests) {
    const tableId = after.get(guest.id) ?? null;
    const target = tableId ? byId.get(tableId) : undefined;
    if (!target) continue;

    const isMoved = guest.tableId !== null && guest.tableId !== tableId;
    const isNew = guest.tableId === null;

    target.occupied += guest.partySize;
    target.guests.push({
      id: guest.id,
      name: guest.name,
      partySize: guest.partySize,
      moved: isMoved,
      fromTable: isMoved ? tableName(guest.tableId) : null,
    });

    if (isNew) seatedCount++;
    else if (isMoved) {
      movedCount++;
      moves.push({
        guestId: guest.id,
        name: guest.name,
        fromTable: tableName(guest.tableId),
        toTable: target.name,
      });
    } else unchangedCount++;
  }

  // A guest the app named who is gone: the card has to say so rather than quietly seating fewer.
  const missing = inputsMissing(input.payload.assignments, guestById);
  const warnings = capacityWarnings(tables);
  if (skipped.length > 0) {
    warnings.push(
      `${skipped.length} ${skipped.length === 1 ? "guest" : "guests"} in this plan can no longer be seated as written.`
    );
  }

  return {
    kind: "seating",
    mode,
    seatedCount,
    movedCount,
    unchangedCount,
    tables: tables
      .filter((table) => table.guests.length > 0)
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      ),
    moves,
    missing,
    warnings,
  };
}

function inputsMissing(
  assignments: { guestId: string }[],
  guests: Map<string, PlanGuest>
): { guestId: string; name: string | null }[] {
  const seen = new Set<string>();
  const missing: { guestId: string; name: string | null }[] = [];

  for (const assignment of assignments) {
    if (guests.has(assignment.guestId) || seen.has(assignment.guestId))
      continue;
    seen.add(assignment.guestId);
    missing.push({ guestId: assignment.guestId, name: null });
  }

  return missing;
}

function capacityWarnings(tables: SeatingPreviewTable[]): string[] {
  return tables
    .filter((table) => table.occupied > table.capacity)
    .map(
      (table) =>
        `“${table.name}” would hold ${table.occupied} guests but seats ${table.capacity}.`
    );
}

/** The guest list the preview needs, narrow enough that a screen never sees an email. */
export interface PreviewGuestRow {
  id: string;
  name: string;
  partySize: number;
  tableId: string | null;
}
