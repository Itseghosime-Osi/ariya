import { z } from "zod";
import { MAX_SEATING_ASSIGNMENTS } from "@/features/seating/plan-checks";
import {
  hallLayoutSchema,
  tablePositionsSchema,
} from "@/features/seating/schemas";

/**
 * Matched to `MAX_PROPOSAL_GUESTS` on the tool side: the payload is re-checked here before anything
 * is sent, so a proposal that somehow holds more than this cannot be applied halfway.
 */
export const MAX_APPLY_GUESTS = 25;

export const proposalIdSchema = z.string().uuid("Proposal id must be a UUID");

/**
 * Re-validation of what the app wrote into the payload. The card and the apply both read from this,
 * so a payload that no longer fits is refused before anything is sent rather than halfway through.
 */
export const proposalPayloadSchema = z.object({
  guestIds: z.array(z.string().uuid()).min(1).max(MAX_APPLY_GUESTS),
  note: z.string().max(300).nullable().optional(),
  requestedCount: z.number().int().nonnegative().optional(),
});

export type ProposalPayload = z.infer<typeof proposalPayloadSchema>;

/**
 * A room proposal: the whole document the hall designer stores, plus where every table stands. The
 * designer's own schemas do the first pass here, so a payload that could not have been saved from
 * the designer is never applied either.
 */
export const hallPayloadSchema = z.object({
  layout: hallLayoutSchema,
  tablePositions: tablePositionsSchema.optional(),
  note: z.string().max(300).nullable().optional(),
});

export type HallPayload = z.infer<typeof hallPayloadSchema>;

/** Re-validated here as well as on the tool side, so a stored payload is never taken on trust. */
export const seatingPayloadSchema = z.object({
  assignments: z
    .array(
      z.object({
        guestId: z.string().uuid(),
        tableId: z.string().uuid(),
        /** Advisory: a seat is not stored, only the table is. Checked when proposing, not applied. */
        seatNumber: z.number().int().min(1).max(50).optional(),
      })
    )
    .min(1)
    .max(MAX_SEATING_ASSIGNMENTS),
  mode: z.enum(["fill_unseated", "rearrange"]).default("fill_unseated"),
  note: z.string().max(300).nullable().optional(),
});

export type SeatingPayload = z.infer<typeof seatingPayloadSchema>;

/** A table as the hall and seating checks need it: what it is called and how many it seats. */
export const snapshotTableSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  capacity: z.number().int().positive(),
  shape: z.string(),
});

/**
 * What the previous room looked like, kept so "Restore previous" can put it back. `null` layout
 * means the celebration had no saved room, in which case restoring puts the tables back and leaves
 * the design alone.
 */
export const hallSnapshotSchema = z.object({
  kind: z.literal("hall"),
  layout: hallLayoutSchema.nullable(),
  tablePositions: tablePositionsSchema,
});

/** Where the guests this plan touched sat before it was applied. A null table means unseated. */
export const seatingSnapshotSchema = z.object({
  kind: z.literal("seating"),
  assignments: z
    .array(
      z.object({
        guestId: z.string().uuid(),
        tableId: z.string().uuid().nullable(),
      })
    )
    .max(1000),
});

export const proposalSnapshotSchema = z.union([
  hallSnapshotSchema,
  seatingSnapshotSchema,
]);

export type HallSnapshot = z.infer<typeof hallSnapshotSchema>;
export type SeatingSnapshot = z.infer<typeof seatingSnapshotSchema>;
export type ProposalSnapshot = z.infer<typeof proposalSnapshotSchema>;
