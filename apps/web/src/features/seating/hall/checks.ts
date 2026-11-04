/**
 * Whether a proposed room would actually work, in the designer's own terms: every table inside the
 * walls, clear of the zones and of its neighbours, and the middle of the hall left open as a route.
 *
 * The rules are the ones the studio draws with (`fit.ts` and `model.ts`), applied to a whole layout
 * at once rather than to one table being placed. Proposing and applying both call this, so an app
 * is held to exactly what the host's own designer would refuse.
 */
import { zoneClearance } from "./fit";
import {
  MAIN_AISLE,
  SPACING_GAP,
  WALL_MARGIN,
  extents,
  footprint,
  gapBetween,
  gapToWalls,
  gapToZone,
  round2,
  type Footprint,
  type HallLayout,
  type Zone,
} from "./model";

export interface HallTable {
  id: string;
  name: string;
  capacity: number;
  shape: string;
}

export interface HallCheckInput {
  layout: Pick<HallLayout, "width" | "length" | "spacing" | "zones">;
  /** Every table the celebration has, placed or not. */
  tables: HallTable[];
  /** Table positions in centimetres from the top-left corner, measured to the table's centre. */
  positions: Record<string, { x: number; y: number }>;
  rotations?: Record<string, number>;
}

interface Placed {
  table: HallTable;
  f: Footprint;
}

/**
 * Everything wrong with a layout, one line each, in the order a person would look at it: the room,
 * then the zones, then the tables against each other. Empty means the designer would accept it.
 */
export function checkHallPlacement(input: HallCheckInput): string[] {
  const problems: string[] = [];
  const known = new Map(input.tables.map((table) => [table.id, table]));

  for (const id of Object.keys(input.positions)) {
    if (!known.has(id)) {
      problems.push(`Table ${id} is not on this celebration.`);
    }
  }

  const placed: Placed[] = [];
  for (const table of input.tables) {
    const position = input.positions[table.id];
    if (!position) {
      problems.push(
        `Table “${table.name}” has no position, so it cannot be placed.`
      );
      continue;
    }

    placed.push({
      table,
      f: footprint(
        table.shape,
        table.capacity,
        round2(position.x / 100),
        round2(position.y / 100),
        input.rotations?.[table.id] ?? 0
      ),
    });
  }

  for (const { table, f } of placed) {
    problems.push(...wallProblems(table, f, input.layout));
    problems.push(...zoneProblems(table, f, input.layout.zones));
  }

  const gap = SPACING_GAP[input.layout.spacing];
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const between = gapBetween(placed[i].f, placed[j].f);
      if (between < gap) {
        problems.push(
          between < 0
            ? `Table “${placed[i].table.name}” overlaps table “${placed[j].table.name}”.`
            : `Table “${placed[i].table.name}” is only ${round2(between)} m from table “${placed[j].table.name}”; ${input.layout.spacing} spacing needs ${gap} m between chair backs.`
        );
      }
    }
  }

  problems.push(...aisleProblems(placed, input.layout));
  return problems;
}

function wallProblems(
  table: HallTable,
  f: Footprint,
  layout: HallCheckInput["layout"]
): string[] {
  const clear = gapToWalls(f, layout.width, layout.length);

  if (clear < 0) {
    return [
      `Table “${table.name}” reaches outside the hall. Move it inwards until it sits entirely inside a ${layout.width} m × ${layout.length} m room.`,
    ];
  }
  if (clear < WALL_MARGIN) {
    return [
      `Table “${table.name}” is only ${round2(clear)} m from the wall; keep ${WALL_MARGIN} m clear all the way round for service and the fire route.`,
    ];
  }
  return [];
}

function zoneProblems(table: HallTable, f: Footprint, zones: Zone[]): string[] {
  const out: string[] = [];

  for (const zone of zones) {
    const clear = gapToZone(f, zone);
    const needed = zoneClearance(zone);

    if (clear < 0) {
      out.push(
        `Table “${table.name}” overlaps the ${zoneName(zone)}, which must stay clear.`
      );
    } else if (clear < needed) {
      out.push(
        `Table “${table.name}” leaves only ${round2(clear)} m around the ${zoneName(zone)}; it needs ${needed} m clear.`
      );
    }
  }

  return out;
}

/**
 * A table may sit in the middle of the hall, but not across the route between its two halves: an
 * aisle only counts as blocked when there are guests on both sides of it.
 */
function aisleProblems(
  placed: Placed[],
  layout: HallCheckInput["layout"]
): string[] {
  const centre = layout.width / 2;
  const half = MAIN_AISLE / 2;

  const inAisle = placed.filter(({ f }) => {
    const { ex } = extents(f);
    return Math.abs(f.x - centre) - ex < half;
  });
  if (inAisle.length === 0) return [];

  const left = placed.some(({ f }) => f.x + extents(f).ex <= centre - half);
  const right = placed.some(({ f }) => f.x - extents(f).ex >= centre + half);
  if (!left || !right) return [];

  return inAisle.map(
    ({ table }) =>
      `Table “${table.name}” blocks the main aisle down the middle of the hall, which has tables on both sides of it.`
  );
}

/** What a person calls a zone, falling back to its kind when it has no label. */
function zoneName(zone: Zone): string {
  const label = zone.label?.trim();
  return label && label.length <= 40 ? label : zone.kind;
}
