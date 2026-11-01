/**
 * Whether a proposed seating plan can actually be carried out: guests and tables that exist, every
 * guest once, nobody beyond a table's seats counting their party, and — for the default mode —
 * nobody who is already seated being moved.
 *
 * Pure, and called from both places that matter: when an app proposes a plan, so it can correct
 * itself before the host ever sees it, and again when the host approves it, because a stored
 * payload is never trusted.
 */

/** One proposal may seat this many guests at once. */
export const MAX_SEATING_ASSIGNMENTS = 300;

export type SeatingMode = "fill_unseated" | "rearrange";

export interface PlanGuest {
  id: string;
  name: string;
  partySize: number;
  /** The table they sit at now, or null when they are unseated. */
  tableId: string | null;
}

export interface PlanTable {
  id: string;
  name: string;
  capacity: number;
}

export interface PlanAssignment {
  guestId: string;
  tableId: string;
  seatNumber?: number;
}

export interface SeatingCheckInput {
  assignments: PlanAssignment[];
  guests: PlanGuest[];
  tables: PlanTable[];
  mode: SeatingMode;
}

/**
 * Every reason the plan would be refused, one line each. Empty means it can be applied as written.
 * `fill_unseated` is strict about the one thing that makes trying again safe: it never moves a
 * guest who already has a table.
 */
export function checkSeatingPlan(input: SeatingCheckInput): string[] {
  const problems: string[] = [];
  const guests = new Map(input.guests.map((guest) => [guest.id, guest]));
  const tables = new Map(input.tables.map((table) => [table.id, table]));

  duplicateGuests(input.assignments, guests, problems);

  // Where everyone would end up, so a table's load is its current guests plus the arrivals.
  const seated = new Map<string, { guests: number; seats: Set<number> }>();
  for (const guest of input.guests) {
    if (guest.tableId && tables.has(guest.tableId)) {
      const entry = seated.get(guest.tableId) ?? {
        guests: 0,
        seats: new Set(),
      };
      entry.guests += guest.partySize;
      seated.set(guest.tableId, entry);
    }
  }

  for (const assignment of input.assignments) {
    const guest = guests.get(assignment.guestId);
    const table = tables.get(assignment.tableId);

    if (!guest) {
      problems.push(`Guest ${assignment.guestId} is not on this celebration.`);
      continue;
    }
    if (!table) {
      problems.push(
        `Guest “${guest.name}” is being seated at table ${assignment.tableId}, which is not on this celebration.`
      );
      continue;
    }
    if (input.mode === "fill_unseated" && guest.tableId !== null) {
      problems.push(
        `Guest “${guest.name}” is already seated. Use the rearrange mode to move guests who are already seated.`
      );
      continue;
    }

    const entry = seated.get(table.id) ?? { guests: 0, seats: new Set() };

    // Already at this table: nobody moves, so the seats they hold must not be counted twice.
    if (guest.tableId === table.id) continue;

    entry.guests += guest.partySize;

    if (assignment.seatNumber !== undefined) {
      if (assignment.seatNumber < 1 || assignment.seatNumber > table.capacity) {
        problems.push(
          `Seat ${assignment.seatNumber} does not exist at “${table.name}”, which seats ${table.capacity}.`
        );
      } else if (entry.seats.has(assignment.seatNumber)) {
        problems.push(
          `Seat ${assignment.seatNumber} at “${table.name}” is given to more than one guest.`
        );
      } else {
        entry.seats.add(assignment.seatNumber);
      }
    }

    seated.set(table.id, entry);
  }

  for (const [tableId, entry] of seated) {
    const table = tables.get(tableId);
    if (table && entry.guests > table.capacity) {
      problems.push(
        `“${table.name}” would hold ${entry.guests} guests but seats ${table.capacity}.`
      );
    }
  }

  if (input.assignments.length > MAX_SEATING_ASSIGNMENTS) {
    problems.push(
      `A plan may seat ${MAX_SEATING_ASSIGNMENTS} guests at a time; this one names ${input.assignments.length}. Split it into more than one proposal.`
    );
  }

  return problems;
}

/** One guest the plan cannot seat, and the reason a host can read. */
export interface SkippedAssignment {
  guestId: string;
  guestName: string | null;
  reason: string;
}

/**
 * What is left of a stored plan once the celebration has moved on since it was proposed: guests
 * deleted, tables removed, seats taken by someone else, or — the rule that makes retrying safe —
 * guests who have been seated in the meantime by a `fill_unseated` plan.
 *
 * Called only at apply time, where dropping the parts that no longer fit is the honest behaviour:
 * the card promised what the plan would do, and what is applied is exactly what it still can.
 */
export function selectApplicableAssignments(input: SeatingCheckInput): {
  applicable: PlanAssignment[];
  /** Guests already at the table the plan names: nothing to write, and nothing to undo. */
  unchanged: PlanAssignment[];
  skipped: SkippedAssignment[];
} {
  const guests = new Map(input.guests.map((guest) => [guest.id, guest]));
  const tables = new Map(input.tables.map((table) => [table.id, table]));
  const seen = new Set<string>();
  const load = new Map<string, number>();

  for (const guest of input.guests) {
    if (guest.tableId && tables.has(guest.tableId)) {
      load.set(guest.tableId, (load.get(guest.tableId) ?? 0) + guest.partySize);
    }
  }

  const applicable: PlanAssignment[] = [];
  const unchanged: PlanAssignment[] = [];
  const skipped: SkippedAssignment[] = [];

  for (const assignment of input.assignments) {
    const guest = guests.get(assignment.guestId);
    const table = tables.get(assignment.tableId);
    const skip = (reason: string) =>
      skipped.push({
        guestId: assignment.guestId,
        guestName: guest?.name ?? null,
        reason,
      });

    if (seen.has(assignment.guestId)) {
      skip("Named more than once in this plan.");
      continue;
    }
    seen.add(assignment.guestId);

    if (!guest) {
      skip("No longer on this celebration.");
      continue;
    }
    if (!table) {
      skip("Its table no longer exists.");
      continue;
    }
    if (input.mode === "fill_unseated" && guest.tableId !== null) {
      skip(
        guest.tableId === table.id
          ? "Already seated at this table."
          : "Was seated by someone else after this plan was proposed."
      );
      continue;
    }
    if (guest.tableId === table.id) {
      unchanged.push(assignment);
      continue;
    }

    const next = (load.get(table.id) ?? 0) + guest.partySize;
    if (next > table.capacity) {
      skip(`“${table.name}” does not have room for them any more.`);
      continue;
    }

    load.set(table.id, next);
    applicable.push(assignment);
  }

  return { applicable, unchanged, skipped };
}

/** A plan that names the same guest twice is refused before anything is counted. */
function duplicateGuests(
  assignments: PlanAssignment[],
  guests: Map<string, PlanGuest>,
  problems: string[]
): void {
  const seen = new Set<string>();

  for (const assignment of assignments) {
    if (seen.has(assignment.guestId)) {
      const guest = guests.get(assignment.guestId);
      problems.push(
        guest
          ? `Guest “${guest.name}” is in this plan more than once.`
          : `Guest ${assignment.guestId} is in this plan more than once.`
      );
    }
    seen.add(assignment.guestId);
  }
}
