/**
 * Seat everyone who is still unseated: families and groups stay together, VIPs go to the high
 * table and the tables nearest the stage, and every table's capacity is respected. A guest's whole
 * party (them plus companions) always sits at one table. Greedy, explainable and instant.
 */

export interface SeatUnit {
  id: string;
  name: string;
  seats: number;
  group: string;
  vip: boolean;
}

export interface SeatTable {
  id: string;
  name: string;
  capacity: number;
  occupied: number;
  shape: string;
  x: number;
  y: number;
}

export interface SeatPlan {
  assignments: { guestId: string; tableId: string }[];
  unplaced: SeatUnit[];
  /** Groups that had to be spread across more than one table. */
  split: string[];
}

export function planSeating(
  units: SeatUnit[],
  tables: SeatTable[],
  front: { x: number; y: number }
): SeatPlan {
  const free = new Map(
    tables.map((t) => [t.id, Math.max(0, t.capacity - t.occupied)])
  );
  const dist = (t: SeatTable) =>
    Math.hypot(t.x - front.x, (t.y - front.y) * 1.4);
  const ordered = [...tables].sort((a, b) => dist(a) - dist(b));
  const head = ordered.filter((t) => t.shape === "head");
  const regular = ordered.filter((t) => t.shape !== "head");

  const groups = new Map<string, SeatUnit[]>();
  for (const u of units) {
    const key = u.group.trim() || "Guests";
    groups.set(key, [...(groups.get(key) ?? []), u]);
  }
  const groupList = [...groups.entries()]
    .map(([name, members]) => ({
      name,
      members: [...members].sort((a, b) => b.seats - a.seats),
      total: members.reduce((s, m) => s + m.seats, 0),
      vip: members.some((m) => m.vip),
    }))
    .sort((a, b) => Number(b.vip) - Number(a.vip) || b.total - a.total);

  const assignments: SeatPlan["assignments"] = [];
  const unplaced: SeatUnit[] = [];
  const split: string[] = [];

  for (const g of groupList) {
    // VIPs first try the high table, then the front; others use the regular tables only.
    const pool = g.vip ? [...head, ...regular] : regular;
    const whole = pool.filter((t) => (free.get(t.id) ?? 0) >= g.total);
    const target = g.vip
      ? whole[0]
      : // Best fit: the table this group fills most snugly, nearest first on a tie.
        whole.sort((a, b) => (free.get(a.id) ?? 0) - (free.get(b.id) ?? 0))[0];
    if (target) {
      for (const m of g.members)
        assignments.push({ guestId: m.id, tableId: target.id });
      free.set(target.id, (free.get(target.id) ?? 0) - g.total);
      continue;
    }
    const used: string[] = [];
    for (const m of g.members) {
      const candidates = [
        ...pool.filter((t) => used.includes(t.id)),
        ...pool.filter((t) => !used.includes(t.id)),
      ];
      const t = candidates.find((c) => (free.get(c.id) ?? 0) >= m.seats);
      if (!t) {
        unplaced.push(m);
        continue;
      }
      assignments.push({ guestId: m.id, tableId: t.id });
      free.set(t.id, (free.get(t.id) ?? 0) - m.seats);
      if (!used.includes(t.id)) used.push(t.id);
    }
    if (used.length > 1) split.push(g.name);
  }
  return { assignments, unplaced, split };
}
