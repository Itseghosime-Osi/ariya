import { z } from "zod";

/** Matched to the tool side: a proposal may name no more guests than an import could add. */
export const MAX_APPLY_GUESTS = 200;

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
