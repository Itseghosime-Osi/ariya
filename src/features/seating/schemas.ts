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

const zoneSchema = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum([
    "stage",
    "dance",
    "buffet",
    "bar",
    "dj",
    "entrance",
    "gifts",
    "photo",
    "pillar",
  ]),
  label: z.string().trim().max(60),
  x: z.number().finite(),
  y: z.number().finite(),
  w: z.number().positive().max(120),
  h: z.number().positive().max(120),
});

const hexColour = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const hallLayoutSchema = z.object({
  version: z.literal(1),
  width: z.number().min(6).max(120),
  length: z.number().min(6).max(120),
  spacing: z.enum(["snug", "comfortable", "spacious"]),
  zones: z.array(zoneSchema).max(60),
  decor: z.object({
    linen: hexColour,
    sash: hexColour,
    chair: z.enum(["gold", "white", "black", "clear"]),
    centrepiece: z.enum(["tall", "low", "candles", "none"]),
    flower: hexColour,
    uplight: hexColour.nullable(),
    drape: hexColour.nullable(),
    floor: z.enum(["marble", "wood", "dark"]),
  }),
  rotations: z.record(z.string().uuid(), z.number().min(-360).max(360)),
});

export const tablePositionsSchema = z
  .array(
    z.object({
      id: z.string().uuid(),
      x: z.number().int().min(-1000).max(13000),
      y: z.number().int().min(-1000).max(13000),
    })
  )
  .max(300);

export const bulkTablesSchema = z.array(createTableSchema).min(1).max(200);

export const bulkAssignSchema = z.array(assignSeatInputSchema).min(1).max(1000);
