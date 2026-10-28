import { daysBetweenLagos } from "@/lib/format";
import { pluralise } from "@/lib/metrics";
import type { EventWithMetrics } from "../types";

export const NEEDS_ATTENTION_LIMIT = 3;
export const RSVP_DEADLINE_WARN_DAYS = 7;
export const EVENT_SOON_WARN_DAYS = 14;
export const FREE_PLAN_WARN_THRESHOLD = 16;
export const FREE_PLAN_LIMIT = 20;

export type NeedsAttentionKind =
  "rsvp_deadline" | "unseated_guests" | "free_plan_limit" | "event_soon";

export interface NeedsAttentionAlert {
  id: string;
  eventId: string;
  eventTitle: string;
  kind: NeedsAttentionKind;
  urgency: number;
  message: string;
  ctaLabel: string;
  href: string;
}

export interface BuildNeedsAttentionOptions {
  now?: Date | string;
  invitedCountByEventId?: Record<string, number>;
}

function formatCloseRelative(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${pluralise(days, "day")}`;
}

/**
 * Builds at most 3 real "Needs attention" items across upcoming events,
 * ordered strictly by urgency:
 * 1. RSVP deadline within 7 days AND awaitingParties > 0
 * 2. Accepted guests not yet seated (seatedGuests < acceptedGuests)
 * 3. Free plan near 20-invite limit (used >= 16 of 20 on unpaid event)
 * 4. Event within 14 days
 */
export function buildNeedsAttention(
  upcomingEvents: EventWithMetrics[],
  options: BuildNeedsAttentionOptions = {}
): NeedsAttentionAlert[] {
  const { now = new Date(), invitedCountByEventId = {} } = options;
  const candidates: NeedsAttentionAlert[] = [];

  for (const { event, metrics } of upcomingEvents) {
    if (event.status === "archived") continue;

    // (a) RSVP deadline within 7 days AND awaiting parties > 0
    if (event.rsvp_by && metrics.awaitingParties > 0) {
      const deadlineDays = daysBetweenLagos(event.rsvp_by, now);
      if (
        !Number.isNaN(deadlineDays) &&
        deadlineDays >= 0 &&
        deadlineDays <= RSVP_DEADLINE_WARN_DAYS
      ) {
        const partiesLabel = pluralise(
          metrics.awaitingParties,
          "party",
          "parties"
        );
        const verb = metrics.awaitingParties === 1 ? "hasn't" : "haven't";
        candidates.push({
          id: `rsvp-deadline-${event.id}`,
          eventId: event.id,
          eventTitle: event.title,
          kind: "rsvp_deadline",
          urgency: 1,
          message: `${partiesLabel} ${verb} replied · RSVP closes ${formatCloseRelative(deadlineDays)}`,
          ctaLabel: "Review awaiting",
          href: `/events/${event.id}/guests?rsvpStatus=pending`,
        });
      }
    }

    // (b) Accepted guests not yet seated (seated < attending)
    if (metrics.seatedGuests < metrics.acceptedGuests) {
      const unseatedCount = metrics.acceptedGuests - metrics.seatedGuests;
      const guestsLabel = pluralise(unseatedCount, "attending guest");
      const verb = unseatedCount === 1 ? "isn't" : "aren't";
      candidates.push({
        id: `unseated-${event.id}`,
        eventId: event.id,
        eventTitle: event.title,
        kind: "unseated_guests",
        urgency: 2,
        message: `${guestsLabel} ${verb} seated yet`,
        ctaLabel: "Assign seats",
        href: `/events/${event.id}/seating`,
      });
    }

    // (c) Free plan near the 20-invite limit (unpaid event with >= 16 of 20 used)
    const invitesUsed = invitedCountByEventId[event.id];
    if (
      !event.paid_at &&
      typeof invitesUsed === "number" &&
      invitesUsed >= FREE_PLAN_WARN_THRESHOLD
    ) {
      const cappedUsed = Math.min(invitesUsed, FREE_PLAN_LIMIT);
      candidates.push({
        id: `free-plan-${event.id}`,
        eventId: event.id,
        eventTitle: event.title,
        kind: "free_plan_limit",
        urgency: 3,
        message: `${cappedUsed} of ${pluralise(FREE_PLAN_LIMIT, "free invite")} used`,
        ctaLabel: "Upgrade plan",
        href: `/events/${event.id}/billing`,
      });
    }

    // (d) Event within 14 days
    const eventDays = daysBetweenLagos(event.date, now);
    if (
      !Number.isNaN(eventDays) &&
      eventDays >= 0 &&
      eventDays <= EVENT_SOON_WARN_DAYS
    ) {
      const timing =
        eventDays === 0 ? "is today" : `is in ${pluralise(eventDays, "day")}`;
      candidates.push({
        id: `event-soon-${event.id}`,
        eventId: event.id,
        eventTitle: event.title,
        kind: "event_soon",
        urgency: 4,
        message: `${event.title} ${timing}`,
        ctaLabel: "Open event",
        href: `/events/${event.id}`,
      });
    }
  }

  candidates.sort((a, b) => a.urgency - b.urgency);
  return candidates.slice(0, NEEDS_ATTENTION_LIMIT);
}
