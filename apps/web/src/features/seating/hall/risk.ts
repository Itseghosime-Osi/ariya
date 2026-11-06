import type { RiskCategory, RiskInput, RiskItem } from "@ariya/studio";
import type { HallLayout } from "./model";
import { wireZone } from "./thermal";

/**
 * The order the register reads in, and the words it groups under. The panel groups, so this is
 * what the host sees from top to bottom.
 */
export const RISK_CATEGORIES: { key: RiskCategory; label: string }[] = [
  { key: "venue", label: "The venue" },
  { key: "weather", label: "Weather" },
  { key: "people", label: "People" },
  { key: "vendors", label: "Vendors" },
  { key: "money", label: "Money" },
  { key: "programme", label: "Programme" },
  { key: "compliance", label: "Compliance" },
];

/**
 * The engine request for a hall plan and a head count.
 *
 * The month comes from the event date, not the clock: the harmattan rule is about when the event
 * is, not when the host is planning it. An absent or unreadable date leaves `month` unset and the
 * rule simply does not fire.
 */
export function riskRequest(
  layout: HallLayout,
  tables: number,
  guests: number,
  eventDate: string | null
): RiskInput {
  const { venue } = layout;
  return {
    eventDate,
    guests,
    venue: venue.type,
    environment: venue.environment,
    tables,
    zones: layout.zones.map(wireZone),
    capacity: venue.capacity?.certified ?? null,
    month: monthOf(eventDate),
    alcohol:
      venue.catering?.alcohol != null && venue.catering.alcohol !== "none",
    power: venue.services?.power ?? null,
    generatorKva: venue.services?.generatorKva ?? null,
    toilets: venue.services?.toilets ?? null,
    designWindMph: venue.structure?.designWindMph ?? null,
    floor: venue.structure?.floor ?? null,
    anchoring: venue.structure?.anchoring ?? null,
    chandeliers: layout.chandeliers,
  };
}

/** The month of an ISO date, 1–12, or null when there is no date to read. */
function monthOf(date: string | null): number | null {
  const m = date ? /^\d{4}-(\d{2})/.exec(date) : null;
  if (!m) return null;
  const month = Number(m[1]);
  return month >= 1 && month <= 12 ? month : null;
}

/**
 * The register split the way the panel shows it. Safety-critical rows come first in every group,
 * because a blocked exit must not sit below a late cake.
 */
export function groupRisks(
  items: RiskItem[]
): { key: RiskCategory; label: string; items: RiskItem[] }[] {
  return RISK_CATEGORIES.map(({ key, label }) => ({
    key,
    label,
    items: items
      .filter((i) => i.category === key)
      .sort((a, b) => Number(b.safetyCritical) - Number(a.safetyCritical)),
  })).filter((g) => g.items.length > 0);
}

/** A due date the way a host reads it: "Sat 21 Nov". */
export function dueWords(due: string): string {
  const date = new Date(`${due}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return due;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Days from today to a due date, for the "this week" ordering. Null when either date is unreadable. */
export function daysUntil(due: string, today = new Date()): number | null {
  const to = Date.parse(`${due}T00:00:00Z`);
  if (Number.isNaN(to)) return null;
  const from = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((to - from) / 86_400_000);
}
