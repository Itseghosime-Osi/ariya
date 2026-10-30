import { z } from "zod";

export const initializePaymentSchema = z.object({
  eventId: z.guid("Invalid event ID"),
});

export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;
