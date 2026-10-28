import {
  daysBetweenLagos,
  formatEventDate,
  getLagosDateKey,
} from "@/lib/format";
import { pluralise } from "@/lib/metrics";
import type { EventWithMetrics } from "../types";

export const COMING_UP_WINDOW_DAYS = 14;

export type ComingUpKind = "event_date" | "rsvp_deadline" | "vendor_task";

export interface ComingUpVendorTaskInput {
  id: string;
  eventId: string;
  task: string;
  dueDate: string | null;
  isDone: boolean;
  vendorName?: string | null;
  vendorCategory?: string | null;
}

export interface ComingUpItem {
  id: string;
  eventId: string;
  eventTitle: string;
  title: string;
  subtitle?: string;
  kind: ComingUpKind;
  dateIso: string;
  lagosDateKey: string;
  formattedDateWAT: string;
  relativeLabel: string;
  daysAway: number;
  href: string;
}

export interface ComingUpDayGroup {
  lagosDateKey: string;
  formattedDateWAT: string;
  relativeLabel: string;
  items: ComingUpItem[];
}

export function relativeDayLabel(
  dateInput: string | Date,
  now: Date | string = new Date()
): string {
  const diff = daysBetweenLagos(dateInput, now);
  if (Number.isNaN(diff)) return "Date not set";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1) return `In ${pluralise(diff, "day")}`;
  if (diff === -1) return "Yesterday";
  return `${pluralise(Math.abs(diff), "day")} ago`;
}

function isWithinComingUpWindow(
  dateInput: string | null | undefined,
  now: Date | string,
  windowDays: number
): { valid: boolean; diff: number; key: string } {
  if (!dateInput) return { valid: false, diff: NaN, key: "" };
  const key = getLagosDateKey(dateInput);
  if (!key) return { valid: false, diff: NaN, key: "" };
  const diff = daysBetweenLagos(dateInput, now);
  const valid = !Number.isNaN(diff) && diff >= 0 && diff < windowDays;
  return { valid, diff, key };
}

const KIND_ORDER: Record<ComingUpKind, number> = {
  event_date: 1,
  rsvp_deadline: 2,
  vendor_task: 3,
};

export function buildComingUp(params: {
  upcomingEvents: EventWithMetrics[];
  vendorTasks?: ComingUpVendorTaskInput[];
  now?: Date | string;
  windowDays?: number;
}): ComingUpItem[] {
  const {
    upcomingEvents,
    vendorTasks = [],
    now = new Date(),
    windowDays = COMING_UP_WINDOW_DAYS,
  } = params;
  const eventMap = new Map<string, EventWithMetrics>();
  for (const item of upcomingEvents) {
    if (item.event.status !== "archived") {
      eventMap.set(item.event.id, item);
    }
  }

  const results: ComingUpItem[] = [];

  for (const { event } of eventMap.values()) {
    const eventWindow = isWithinComingUpWindow(event.date, now, windowDays);
    if (eventWindow.valid) {
      results.push({
        id: `event-${event.id}`,
        eventId: event.id,
        eventTitle: event.title,
        title: event.title,
        subtitle: event.venue || undefined,
        kind: "event_date",
        dateIso: event.date,
        lagosDateKey: eventWindow.key,
        formattedDateWAT: formatEventDate(event.date),
        relativeLabel: relativeDayLabel(event.date, now),
        daysAway: eventWindow.diff,
        href: `/events/${event.id}`,
      });
    }

    if (event.rsvp_by) {
      const rsvpWindow = isWithinComingUpWindow(event.rsvp_by, now, windowDays);
      if (rsvpWindow.valid) {
        results.push({
          id: `rsvp-${event.id}`,
          eventId: event.id,
          eventTitle: event.title,
          title: "RSVP deadline",
          kind: "rsvp_deadline",
          dateIso: event.rsvp_by,
          lagosDateKey: rsvpWindow.key,
          formattedDateWAT: formatEventDate(event.rsvp_by),
          relativeLabel: relativeDayLabel(event.rsvp_by, now),
          daysAway: rsvpWindow.diff,
          href: `/events/${event.id}/guests`,
        });
      }
    }
  }

  for (const task of vendorTasks) {
    if (task.isDone || !task.dueDate) continue;
    const parent = eventMap.get(task.eventId);
    if (!parent) continue;

    const taskWindow = isWithinComingUpWindow(task.dueDate, now, windowDays);
    if (taskWindow.valid) {
      results.push({
        id: `task-${task.id}`,
        eventId: parent.event.id,
        eventTitle: parent.event.title,
        title: task.task,
        subtitle: task.vendorName || task.vendorCategory || undefined,
        kind: "vendor_task",
        dateIso: task.dueDate,
        lagosDateKey: taskWindow.key,
        formattedDateWAT: formatEventDate(task.dueDate),
        relativeLabel: relativeDayLabel(task.dueDate, now),
        daysAway: taskWindow.diff,
        href: `/events/${parent.event.id}/vendors`,
      });
    }
  }

  results.sort((a, b) => {
    if (a.lagosDateKey !== b.lagosDateKey) {
      return a.lagosDateKey.localeCompare(b.lagosDateKey);
    }
    const kindDiff = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (kindDiff !== 0) return kindDiff;
    return a.title.localeCompare(b.title);
  });

  return results;
}

/**
 * Groups sorted ComingUpItem[] by their Africa/Lagos calendar day key.
 */
export function groupByLagosDay(items: ComingUpItem[]): ComingUpDayGroup[] {
  const groups: ComingUpDayGroup[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.lagosDateKey === item.lagosDateKey) {
      last.items.push(item);
    } else {
      groups.push({
        lagosDateKey: item.lagosDateKey,
        formattedDateWAT: item.formattedDateWAT,
        relativeLabel: item.relativeLabel,
        items: [item],
      });
    }
  }
  return groups;
}
