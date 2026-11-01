import {
  centrepieceSchema,
  chairTypeSchema,
  floorFinishSchema,
  HALL_CEILING_MAX,
  HALL_CEILING_MIN,
  HALL_MAX_CHAIRS,
  HALL_MAX_SIZE,
  HALL_MAX_TABLE_POSITIONS,
  HALL_MAX_ZONES,
  HALL_MIN_SIZE,
  MAX_HALL_LAYOUT_BYTES,
  TABLE_POSITION_MAX,
  TABLE_POSITION_MIN,
  zoneKindSchema,
} from "@/features/seating/schemas";
import {
  AREA_PER_DINER,
  CHAIR_DEPTH,
  CHAIR_TYPES,
  DECOR_PRESETS,
  HALL_PRESETS,
  MAIN_AISLE,
  SPACING_GAP,
  WALL_MARGIN,
  ZONE_CLEARANCE,
  ZONE_DEFAULTS,
} from "@/features/seating/hall/model";

/**
 * Style starting points, named the way a host would ask for them. Each one only points at keys the
 * designer already ships, and is resolved against those presets when the tool is called, so a
 * renamed or removed preset cannot leave a style recommending something that does not exist.
 */
const STYLE_STARTERS = [
  {
    key: "classic",
    label: "Classic ballroom",
    hall: "medium",
    decor: "burgundy",
    spacing: "comfortable",
    idea: "Long top table, stage at the head of the room, dance floor between them.",
  },
  {
    key: "garden",
    label: "Garden reception",
    hall: "large",
    decor: "emerald",
    spacing: "spacious",
    idea: "Generous gaps between tables, greenery and low centrepieces, buffet along a side wall.",
  },
  {
    key: "modern",
    label: "Modern and pared back",
    hall: "medium",
    decor: "white",
    spacing: "spacious",
    idea: "Even grid of round tables, no head table, bar central so it does not queue past diners.",
  },
  {
    key: "intimate",
    label: "Intimate family celebration",
    hall: "intimate",
    decor: "coral",
    spacing: "snug",
    idea: "One long table or a tight cluster, dance floor small and close to the tables.",
  },
] as const;

/**
 * Everything a connected app must respect to propose a hall the designer will actually accept.
 * Every number here is read from the validator's own constants, so this document cannot drift from
 * what `hallLayoutSchema` enforces.
 *
 * Units are the designer's: hall dimensions and zone sizes in metres, table positions in
 * centimetres from the top-left corner of the hall.
 */
export function hallRules() {
  return {
    units: {
      hall: "metres",
      zones: "metres",
      tables: "centimetres, from the top-left corner of the hall",
      rotation: "degrees, clockwise",
    },
    limits: {
      hall: {
        minWidth: HALL_MIN_SIZE,
        maxWidth: HALL_MAX_SIZE,
        minLength: HALL_MIN_SIZE,
        maxLength: HALL_MAX_SIZE,
      },
      zones: {
        max: HALL_MAX_ZONES,
        kinds: zoneKindSchema.options,
        defaults: ZONE_DEFAULTS,
      },
      tables: {
        maxPositions: HALL_MAX_TABLE_POSITIONS,
        positionMin: TABLE_POSITION_MIN,
        positionMax: TABLE_POSITION_MAX,
      },
      chairs: { max: HALL_MAX_CHAIRS },
      ceiling: { min: HALL_CEILING_MIN, max: HALL_CEILING_MAX },
      spacing: {
        options: Object.keys(SPACING_GAP),
        gapMetres: SPACING_GAP,
      },
      decor: {
        presets: DECOR_PRESETS.map((preset) => ({
          key: preset.key,
          label: preset.label,
          decor: preset.decor,
        })),
        chairTypes: chairTypeSchema.options.map((key) => ({
          key,
          label: CHAIR_TYPES.find((type) => type.key === key)?.label ?? key,
        })),
        centrepieces: centrepieceSchema.options,
        floors: floorFinishSchema.options,
        colourFormat: "hex, for example #6e1426",
      },
      payload: {
        maxBytes: MAX_HALL_LAYOUT_BYTES,
        note: "A layout larger than this can never be saved, so it is refused when proposed.",
      },
    },
    clearances: {
      wallMarginMetres: WALL_MARGIN,
      zoneClearanceMetres: ZONE_CLEARANCE,
      mainAisleMetres: MAIN_AISLE,
      chairDepthMetres: CHAIR_DEPTH,
      areaPerDinerSqm: AREA_PER_DINER,
    },
    guidance: [
      "Keep a clear aisle at least as wide as the main aisle between blocks of tables, and never block an entrance.",
      "Put the stage or head table at one end and the dance floor just in front of it, so dancing does not cut across diners.",
      "Leave the wall margin clear all the way round: it is the service route and the fire exit route.",
      "Keep the bar and buffet away from table rows, so queues do not form beside seated guests.",
      "Leave space for wheelchairs and pushchairs at the ends of rows, not only in the middle.",
      "Size the room from the guest count rather than guessing: about one diner per 1.4 square metres of dining area, before zones.",
      "Every table must sit entirely inside the hall and must not overlap another table or a zone.",
      "If the brief is thin, ask first — guest count, number of tables, dance floor size, stage, entrance side and style — then propose a complete layout rather than guessing silently.",
    ],
    styleStarters: resolveStyles(),
    hallPresets: HALL_PRESETS,
  };
}

/** Preset references turned into a usable starting point, skipping any that no longer exist. */
function resolveStyles() {
  const halls = new Map(HALL_PRESETS.map((preset) => [preset.key, preset]));
  const decors = new Map(DECOR_PRESETS.map((preset) => [preset.key, preset]));

  return STYLE_STARTERS.flatMap((style) => {
    const hall = halls.get(style.hall);
    const decor = decors.get(style.decor);
    if (!hall || !decor) return [];

    return [
      {
        key: style.key,
        label: style.label,
        idea: style.idea,
        width: hall.width,
        length: hall.length,
        spacing: style.spacing,
        spacingGapMetres: SPACING_GAP[style.spacing],
        decorKey: decor.key,
        decorLabel: decor.label,
        decor: decor.decor,
      },
    ];
  });
}
