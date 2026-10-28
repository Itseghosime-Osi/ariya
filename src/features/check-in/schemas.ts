import { z } from "zod";

export const checkInInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Check-in code or pass token is required")
    .max(50, "Code is too long"),
  count: z
    .number()
    .int("Count must be an integer")
    .min(1, "Admit count must be at least 1")
    .default(1),
});

export type CheckInInput = z.infer<typeof checkInInputSchema>;
