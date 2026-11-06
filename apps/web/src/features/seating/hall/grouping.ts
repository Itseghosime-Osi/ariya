import type { FreeChair, HallLayout, ItemGroup, SeatKind, Zone } from "./model";
import { round2, zoneId } from "./model";

/**
 * Grouping, duplication and row placement: the pure maths behind the canvas gestures, kept out of
 * the component so the behaviour is testable without a renderer.
 */

export type PickedType = "table" | "zone" | "chair" | "ac";
export interface Picked {
  type: PickedType;
  id: string;
}

/**
 * The selection a click should produce once groups are taken into account: picking any member of
 * a group selects the whole group, so a group is one thing to move.
 */
export function expandSelection(
  picked: Picked[],
  groups: ItemGroup[]
): Picked[] {
  const found = new Set<string>();
  const out: Picked[] = [];
  const key = (p: Picked) => `${p.type}:${p.id}`;
  const push = (p: Picked) => {
    if (found.has(key(p))) return;
    found.add(key(p));
    out.push({ type: p.type, id: p.id });
  };
  for (const p of picked) {
    const group = groups.find((g) => g.items.some((i) => i.id === p.id));
    if (group) for (const i of group.items) push({ type: i.type, id: i.id });
    else push(p);
  }
  return out;
}

/** The group that holds every item in `selection`, or null when they are not all in one group. */
export function groupHolding(
  selection: Picked[],
  groups: ItemGroup[]
): ItemGroup | null {
  if (selection.length === 0) return null;
  const ids = new Set(selection.map((s) => s.id));
  return (
    groups.find((g) => {
      const members = new Set(g.items.map((i) => i.id));
      // The whole group, not a part of it: a lone member is its own selection, and offering to
      // rename "the group" for it would be a lie.
      return (
        [...ids].every((id) => members.has(id)) && ids.size === members.size
      );
    }) ?? null
  );
}

/** Make a group out of what is selected. Returns the new list and the group made. */
export function makeGroup(
  layout: HallLayout,
  selection: Picked[],
  name: string
): { groups: ItemGroup[]; group: ItemGroup } {
  const group: ItemGroup = {
    id: zoneId(),
    name: name.trim().slice(0, 60) || "Group",
    // A group holds things you can drag on the floor; an AC unit is edited on its own panel.
    items: selection
      .filter(
        (s): s is Picked & { type: ItemGroup["items"][number]["type"] } =>
          s.type === "table" || s.type === "zone" || s.type === "chair"
      )
      .map((s) => ({ type: s.type, id: s.id })),
  };
  // An item belongs to one group: making a new one takes it out of any older one.
  const ids = new Set(group.items.map((i) => i.id));
  const groups = layout.groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !ids.has(i.id)) }))
    .filter((g) => g.items.length > 0);
  return { groups: [...groups, group], group };
}

/** Drop ids from every group, and forget groups left with fewer than two members. */
export function forgetItems(
  groups: ItemGroup[],
  gone: Set<string>
): ItemGroup[] {
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !gone.has(i.id)) }))
    .filter((g) => g.items.length > 1);
}

/** Where a copy of a chair goes: clear of the original, and never outside the hall. */
export function copyChair(
  chair: FreeChair,
  layout: HallLayout,
  offset = 0.8
): FreeChair {
  return {
    ...chair,
    id: zoneId(),
    x: round2(Math.min(chair.x + offset, layout.width - 0.4)),
    y: round2(Math.min(chair.y + offset, layout.length - 0.4)),
  };
}

/** Where a copy of a zone goes, the same way. */
export function copyZone(zone: Zone, layout: HallLayout, offset = 1): Zone {
  return {
    ...zone,
    id: zoneId(),
    x: round2(Math.min(zone.x + offset, layout.width - zone.w / 2)),
    y: round2(Math.min(zone.y + offset, layout.length - zone.h / 2)),
  };
}

/** Chairs sitting in a row, centred on (x, y), evenly spaced. */
export function chairRow(
  n: number,
  spacing: number,
  x: number,
  y: number,
  rot = 0,
  seat: SeatKind = "guest"
): FreeChair[] {
  const stamp = zoneId();
  return Array.from({ length: Math.max(1, n) }, (_, i) => ({
    id: `${stamp}c${i}`,
    x: round2(x + (i - (n - 1) / 2) * spacing),
    y: round2(y),
    rot,
    seat,
    seats: seat === "couch" ? 2 : 1,
  }));
}

/**
 * Table slots for a block of tables: `n` tables laid out `perRow` across, as many rows as needed,
 * each row `gapY` apart and centred on (x, y).
 */
export function tableRowSlots(
  n: number,
  perRow: number,
  layout: { width: number; length: number },
  x: number,
  y: number,
  gapY = 2.4
): { x: number; y: number }[] {
  const cols = Math.max(1, Math.min(perRow, n));
  const rows = Math.ceil(n / cols);
  const stepX = layout.width / (cols + 1);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inRow = Math.min(cols, n - row * cols);
    const rowWidth = stepX * Math.max(0, inRow - 1);
    const left = x - rowWidth / 2;
    out.push({
      x: round2(Math.min(Math.max(left + col * stepX, 1), layout.width - 1)),
      y: round2(
        Math.min(
          Math.max(y + (row - (rows - 1) / 2) * gapY, 1),
          layout.length - 1
        )
      ),
    });
  }
  return out;
}
