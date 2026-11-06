import type { ChecklistInput, Phase } from "@ariya/studio";

export type TaskStatus = "todo" | "waiting" | "done" | "skipped";

/** Where a row came from: the template, a rule that fired on this plan, or the host's own typing. */
export type ChecklistTaskSource = "template" | "generated" | "manual";

/** The derivation the generator writes: why a row exists, as data rather than a sentence. */
export interface TaskDerivation {
  kind?: string;
  count?: number;
  [key: string]: unknown;
}

/** One row of the checklist as the page holds it. */
export interface ChecklistTask {
  id: string;
  title: string;
  detail: string | null;
  phase: Phase;
  dueDate: string | null;
  status: TaskStatus;
  ownerId: string | null;
  source: ChecklistTaskSource;
  sourceKey: string | null;
  derivation: TaskDerivation | null;
  sort: number;
  completedAt: string | null;
}

export interface ChecklistMember {
  userId: string;
  role: string;
  name: string;
}

export interface ChecklistData {
  event: {
    id: string;
    title: string;
    couple: string | null;
    date: string | null;
  };
  tasks: ChecklistTask[];
  members: ChecklistMember[];
  /** The event has never had a list, so the page offers the first run. */
  seeded: boolean;
  /**
   * The generator's request for this event, or null when there is no hall plan to read. The first
   * run needs a hall; a hand-typed list does not.
   */
  input: ChecklistInput | null;
  guests: number;
  tables: number;
}

/** The filters, in the order the chip row shows them. */
export type ChecklistFilter = "all" | "mine" | "waiting" | "week";

export const PHASE_ORDER: Phase[] = [
  "foundations",
  "book",
  "build",
  "detail",
  "final",
  "day",
  "after",
];

export const PHASE_LABELS: Record<Phase, string> = {
  foundations: "Foundations",
  book: "Book the day",
  build: "Build the room",
  detail: "Detail",
  final: "Final week",
  day: "Day of",
  after: "After",
};
