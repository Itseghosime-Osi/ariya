import { z } from "zod";

export const createEventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Celebration title must be at least 3 characters"),
  couple: z
    .string()
    .trim()
    .min(3, "Couple names must be at least 3 characters"),
  date: z.string().min(1, "Celebration date is required"),
  venue: z.string().trim().min(2, "Venue location is required"),
  area: z.string().trim().optional(),
  dressCode: z.string().trim().optional(),
  registryCode: z.string().trim().optional(),
  targetParties: z.number().int().min(1).default(200),
  rsvpBy: z.string().optional(),
  intakeMethod: z.enum(["csv", "manual", "skip"]).default("csv"),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema.partial().extend({
  status: z.enum(["draft", "active", "archived"]).optional(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;
