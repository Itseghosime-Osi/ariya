import { z } from "zod";

export const tableShapeSchema = z.enum([
  "round",
  "rectangular",
  "oval",
  "head",
]);

export const createTableSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Table designation or name is required")
    .max(50, "Name must not exceed 50 characters"),
  capacity: z
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1 seat")
    .max(50, "Capacity cannot exceed 50 seats per table"),
  shape: tableShapeSchema.default("round"),
  position_x: z.number().int().default(0),
  position_y: z.number().int().default(0),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;

export const updateTableSchema = createTableSchema.partial();
export type UpdateTableInput = z.infer<typeof updateTableSchema>;

export const assignSeatInputSchema = z.object({
  guestId: z.string().uuid("Invalid guest identifier"),
  tableId: z.string().uuid("Invalid table identifier").nullable(),
});

export type AssignSeatInput = z.infer<typeof assignSeatInputSchema>;
