/**
 * Test-only building blocks for the approvals previews: a room and two tables that the designer's
 * own rules already accept, so a test changes one thing and reads the sentence that change makes.
 *
 * Everything here comes from `defaultLayout`, `defaultZones`, `ZONE_DEFAULTS` and `HALL_PRESETS`
 * rather than from hand-written JSON, so these tests cannot drift into describing a document the
 * designer would no longer open.
 */

import {
  HALL_PRESETS,
  ZONE_DEFAULTS,
  defaultLayout,
  type HallLayout,
  type Zone,
  type ZoneKind,
} from "../seating/hall/model";
import type { PlanGuest } from "../seating/plan-checks";
import type { PreviewTableInput } from "./previews";
import type { HallPayload } from "./schemas";

function preset(key: string) {
  const found = HALL_PRESETS.find((candidate) => candidate.key === key);
  if (!found) {
    throw new Error(`The hall presets no longer include a "${key}" room.`);
  }
  return found;
}

const MEDIUM = preset("medium");

/** A UUID the payload schemas accept, so a payload built here passes what a stored one must. */
export function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

export const TABLE_1 = uuid(1);
export const TABLE_2 = uuid(2);

/** The room as the designer opens it: a full hall with its stage, dance floor, buffet and bar. */
export function hallLayout(change: Partial<HallLayout> = {}): HallLayout {
  return { ...defaultLayout(MEDIUM.width, MEDIUM.length), ...change };
}

/**
 * Two eight-seaters at the back of the room, where nothing objects: clear of the zones, clear of the
 * walls by more than the service margin, and either side of the centre aisle rather than across it.
 */
export const TABLES: PreviewTableInput[] = [
  {
    id: TABLE_1,
    name: "Table 1",
    capacity: 8,
    shape: "round",
    x: 1000,
    y: 1700,
  },
  {
    id: TABLE_2,
    name: "Table 2",
    capacity: 8,
    shape: "round",
    x: 2000,
    y: 1700,
  },
];

/** A room proposal that changes nothing until `layout` or `tables` says otherwise. */
export function payloadOf(
  layout: HallLayout,
  tables: PreviewTableInput[] = TABLES
): HallPayload {
  return {
    layout,
    tablePositions: tables.map((table) => ({
      id: table.id,
      x: table.x,
      y: table.y,
    })),
  };
}

/** A zone the designer would draw, sized from its own defaults, placed wherever a test says. */
export function zone(
  kind: ZoneKind,
  at: { x: number; y: number; w?: number; h?: number } = { x: 0, y: 0 }
): Zone {
  const defaults = ZONE_DEFAULTS[kind];

  return {
    id: uuid(900 + Object.keys(ZONE_DEFAULTS).indexOf(kind)),
    kind,
    label: defaults.label,
    x: at.x,
    y: at.y,
    w: at.w ?? defaults.w,
    h: at.h ?? defaults.h,
  };
}

/** A guest, seated where `tableId` says and nowhere otherwise. */
export function guest(
  n: number,
  overrides: Partial<Omit<PlanGuest, "id">> = {}
): PlanGuest {
  return {
    id: uuid(500 + n),
    name: `Guest ${n}`,
    partySize: 1,
    tableId: null,
    ...overrides,
  };
}
