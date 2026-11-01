import { z } from "zod";

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
