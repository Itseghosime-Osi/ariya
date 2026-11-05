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
  guestId: z.guid("Invalid guest identifier"),
  tableId: z.guid("Invalid table identifier").nullable(),
});

export type AssignSeatInput = z.infer<typeof assignSeatInputSchema>;

export const zoneKindSchema = z.enum([
  "stage",
  "dance",
  "buffet",
  "bar",
  "dj",
  "entrance",
  "gifts",
  "photo",
  "pillar",
  "cake",
  "custom",
]);

const zoneSchema = z.object({
  id: z.string().min(1).max(40),
  kind: zoneKindSchema,
  label: z.string().trim().max(60),
  x: z.number().finite(),
  y: z.number().finite(),
  w: z.number().positive().max(120),
  h: z.number().positive().max(120),
  shape: z
    .enum(["rect", "round", "oval", "hexagon", "octagon", "heart"])
    .optional(),
  rot: z.number().min(-360).max(360).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  finish: z
    .enum(["gloss", "led", "white", "wood", "checker", "carpet", "marble"])
    .optional(),
  height: z.number().min(0).max(3).optional(),
  variant: z.enum(["table", "block"]).optional(),
});

const hexColour = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const chairTypeSchema = z.enum([
  "chiavari-gold",
  "chiavari-silver",
  "chiavari-white",
  "ghost",
  "crossback",
  "covered",
]);
export const centrepieceSchema = z.enum([
  "tall",
  "low",
  "candles",
  "lanterns",
  "none",
]);
export const floorFinishSchema = z.enum(["marble", "wood", "dark", "carpet"]);

/**
 * The hall designer's bounds, named so the rules handed to a connected app are generated from the
 * very same numbers the validator enforces. Anything that restates them would eventually drift.
 */
export const HALL_MIN_SIZE = 6;
export const HALL_MAX_SIZE = 120;
export const HALL_MAX_ZONES = 60;
export const HALL_MAX_CHAIRS = 400;
export const HALL_CEILING_MIN = 3;
export const HALL_CEILING_MAX = 15;
export const TABLE_POSITION_MIN = -1000;
export const TABLE_POSITION_MAX = 13000;
export const HALL_MAX_TABLE_POSITIONS = 300;

/** `events.hall_layout` refuses anything larger, so a proposal beyond it could never be applied. */
export const MAX_HALL_LAYOUT_BYTES = 64 * 1024;

export const venueTypeSchema = z.enum([
  "hall",
  "pillared-hall",
  "marquee",
  "pole-tent",
  "stretch-tent",
  "garden",
  "field",
  "beach",
  "rooftop",
  "church",
  "hybrid",
]);

// Every field defaults to null so a proposal may omit it, while the parsed output always matches
// the generated `VenueProfile` shape (which has no optional members).
export const venueProfileSchema = z.object({
  type: venueTypeSchema,
  environment: z.enum(["indoor", "covered", "outdoor"]),
  structure: z
    .object({
      clearspan: z.number().nullable().default(null),
      legModule: z.number().nullable().default(null),
      designWindMph: z.number().nullable().default(null),
      anchoring: z.string().max(120).nullable().default(null),
      floor: z.string().max(120).nullable().default(null),
    })
    .nullable()
    .default(null),
  services: z
    .object({
      power: z.string().max(120).nullable().default(null),
      generatorKva: z.number().nullable().default(null),
      water: z.string().max(120).nullable().default(null),
      toilets: z.number().int().nullable().default(null),
      parking: z.number().int().nullable().default(null),
    })
    .nullable()
    .default(null),
  capacity: z
    .object({
      certified: z.number().int().nullable().default(null),
      source: z.string().max(120).nullable().default(null),
    })
    .nullable()
    .default(null),
  climate: z
    .object({
      city: z.string().max(120).nullable().default(null),
      month: z.number().int().min(1).max(12).nullable().default(null),
      outdoorC: z.number().nullable().default(null),
      rh: z.number().nullable().default(null),
    })
    .nullable()
    .default(null),
  sun: z
    .object({
      azimuth: z.number().nullable().default(null),
      elevation: z.number().nullable().default(null),
    })
    .nullable()
    .default(null),
  wind: z
    .object({
      direction: z.number().nullable().default(null),
      speedMph: z.number().nullable().default(null),
    })
    .nullable()
    .default(null),
});

export const hallLayoutSchema = z.object({
  version: z.literal(2),
  venue: venueProfileSchema,
  width: z.number().min(HALL_MIN_SIZE).max(HALL_MAX_SIZE),
  length: z.number().min(HALL_MIN_SIZE).max(HALL_MAX_SIZE),
  spacing: z.enum(["snug", "comfortable", "spacious"]),
  zones: z.array(zoneSchema).max(HALL_MAX_ZONES),
  decor: z.object({
    linen: hexColour,
    sash: hexColour.nullable(),
    chair: chairTypeSchema,
    cover: hexColour,
    centrepiece: centrepieceSchema,
    flower: hexColour,
    uplight: hexColour.nullable(),
    drape: hexColour.nullable(),
    floor: floorFinishSchema,
    wall: hexColour,
  }),
  rotations: z.record(z.string().uuid(), z.number().min(-360).max(360)),
  tableStyles: z.record(
    z.string().uuid(),
    z.object({
      cloth: hexColour.optional(),
      chair: chairTypeSchema.optional(),
      cover: hexColour.optional(),
      sash: hexColour.nullable().optional(),
      centrepiece: centrepieceSchema.optional(),
      flower: hexColour.optional(),
    })
  ),
  chairs: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        x: z.number().finite(),
        y: z.number().finite(),
        rot: z.number().min(-360).max(360),
        chair: chairTypeSchema.optional(),
      })
    )
    .max(HALL_MAX_CHAIRS),
  mood: z.enum(["day", "evening"]),
  chandeliers: z.boolean(),
  ceiling: z.number().min(HALL_CEILING_MIN).max(HALL_CEILING_MAX),
});

export const tablePositionsSchema = z
  .array(
    z.object({
      id: z.string().uuid(),
      x: z.number().int().min(TABLE_POSITION_MIN).max(TABLE_POSITION_MAX),
      y: z.number().int().min(TABLE_POSITION_MIN).max(TABLE_POSITION_MAX),
    })
  )
  .max(HALL_MAX_TABLE_POSITIONS);

export const bulkTablesSchema = z.array(createTableSchema).min(1).max(200);

export const bulkAssignSchema = z.array(assignSeatInputSchema).min(1).max(1000);
