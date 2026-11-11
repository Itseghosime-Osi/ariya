/**
 * Keep-together and keep-apart rules for seating.
 *
 * A host says "these guests sit together" (a family split across invitations) or "these guests
 * never share a table" (relatives who must be kept apart). The rules live in the hall document,
 * so they need no migration, travel with the plan and are checked by auto-seat and the Risks list.
 * Pure: no React, no database.
 */

export type SeatRuleKind = "together" | "apart";

export interface SeatRule {
  id: string;
  kind: SeatRuleKind;
  guestIds: string[];
  note?: string;
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_RULES = 50;
export const MAX_RULE_GUESTS = 20;

/** Keep only well-formed rules; drop duplicates of a guest within a rule. */
export function normaliseRules(raw: unknown): SeatRule[] {
  if (!Array.isArray(raw)) return [];
  const out: SeatRule[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const x = r as Partial<SeatRule>;
    if (x.kind !== "together" && x.kind !== "apart") continue;
    if (typeof x.id !== "string" || !x.id || x.id.length > 40) continue;
    const ids = Array.isArray(x.guestIds)
      ? [
          ...new Set(
            x.guestIds.filter(
              (g): g is string => typeof g === "string" && GUID.test(g)
            )
          ),
        ]
      : [];
    if (ids.length < 2) continue;
    out.push({
      id: x.id,
      kind: x.kind,
      guestIds: ids.slice(0, MAX_RULE_GUESTS),
      ...(typeof x.note === "string" && x.note.trim()
        ? { note: x.note.trim().slice(0, 80) }
        : {}),
    });
    if (out.length >= MAX_RULES) break;
  }
  return out;
}

/** Forget guests who are no longer on the list; a rule left with fewer than two guests goes. */
export function pruneRules(rules: SeatRule[], known: Set<string>): SeatRule[] {
  return rules
    .map((r) => ({ ...r, guestIds: r.guestIds.filter((id) => known.has(id)) }))
    .filter((r) => r.guestIds.length >= 2);
}

export interface RuleBreak {
  rule: SeatRule;
  /** What is wrong, in the host's words. */
  reason: string;
}

/**
 * Which rules the current seating breaks. A together rule breaks when two of its seated guests sit
 * at different tables; an apart rule breaks when two of its guests share a table. Guests without a
 * seat yet break nothing.
 */
export function ruleBreaks(
  rules: SeatRule[],
  tableOf: Map<string, string | null>,
  nameOf: (guestId: string) => string,
  tableName: (tableId: string) => string
): RuleBreak[] {
  const out: RuleBreak[] = [];
  for (const rule of rules) {
    const seated = rule.guestIds
      .map((id) => ({ id, table: tableOf.get(id) ?? null }))
      .filter((s): s is { id: string; table: string } => !!s.table);
    if (rule.kind === "together") {
      const tables = [...new Set(seated.map((s) => s.table))];
      if (tables.length > 1) {
        out.push({
          rule,
          reason: `Meant to sit together, but spread over ${tables
            .map(tableName)
            .join(" and ")}.`,
        });
      }
    } else {
      const byTable = new Map<string, string[]>();
      for (const s of seated)
        byTable.set(s.table, [...(byTable.get(s.table) ?? []), s.id]);
      for (const [table, ids] of byTable) {
        if (ids.length > 1) {
          out.push({
            rule,
            reason: `${ids.map(nameOf).join(" and ")} share ${tableName(table)}, but are meant to be kept apart.`,
          });
        }
      }
    }
  }
  return out;
}

/** For each guest, the guests they must not share a table with. */
export function apartMap(rules: SeatRule[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const r of rules) {
    if (r.kind !== "apart") continue;
    for (const a of r.guestIds) {
      const set = m.get(a) ?? new Set<string>();
      for (const b of r.guestIds) if (b !== a) set.add(b);
      m.set(a, set);
    }
  }
  return m;
}

/** For each guest in a together rule, the rule's key, so the planner seats them as one group. */
export function togetherKey(rules: SeatRule[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rules) {
    if (r.kind !== "together") continue;
    for (const id of r.guestIds) if (!m.has(id)) m.set(id, `rule:${r.id}`);
  }
  return m;
}

export function newRuleId() {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
