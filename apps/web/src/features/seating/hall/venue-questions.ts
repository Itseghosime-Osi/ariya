/**
 * The questions the studio asks about a venue, per type.
 *
 * Only facts that change the design are here: each one names what it feeds, so a field with no
 * consumer in the solver, the thermal model, the risk register or the checklist does not get
 * asked. The answers live in `HallLayout.venue`, so the renderer, the solver and the checklist
 * all read one document.
 */
import { z } from "zod";

import type { VenueProfile, VenueType } from "@ariya/studio";

export type QuestionKind = "number" | "text" | "select";

/** The parts of the studio an answer can change. A question that feeds none of them is not asked. */
export type Consumer = "solver" | "thermal" | "risk" | "checklist" | "renderer";

export const CONSUMERS: readonly Consumer[] = [
  "solver",
  "thermal",
  "risk",
  "checklist",
  "renderer",
];

export interface VenueQuestion {
  /** Dotted path into `VenueProfile`, for example `structure.legModule`. */
  key: string;
  label: string;
  kind: QuestionKind;
  unit?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  /** A select whose stored value is a number, so `"3"` is written as `3`. */
  numeric?: boolean;
  /** What this answer changes. Shown under the field as "why we ask". */
  consumer: string;
  /** The same thing, structured, so a test can prove every question has a consumer. */
  feeds: Consumer[];
}

export interface QuestionGroup {
  title: string;
  questions: VenueQuestion[];
}

const POWER: VenueQuestion = {
  key: "services.power",
  label: "Power",
  kind: "select",
  options: [
    { value: "mains", label: "Mains" },
    { value: "generator", label: "Generator" },
    { value: "solar", label: "Solar & battery" },
  ],
  consumer: "Decides the generator, fuel and changeover tasks.",
  feeds: ["checklist"],
};

const GENERATOR: VenueQuestion = {
  key: "services.generatorKva",
  label: "Generator size",
  kind: "number",
  unit: "kVA",
  min: 0,
  max: 2000,
  step: 5,
  consumer: "Sizes the generator hire and the fuel estimate.",
  feeds: ["checklist"],
};

const TOILETS: VenueQuestion = {
  key: "services.toilets",
  label: "Toilets",
  kind: "number",
  unit: "units",
  min: 0,
  max: 500,
  step: 1,
  consumer: "Sets the toilet and attendant tasks.",
  feeds: ["checklist"],
};

const PARKING: VenueQuestion = {
  key: "services.parking",
  label: "Parking",
  kind: "number",
  unit: "spaces",
  min: 0,
  max: 5000,
  step: 10,
  consumer: "Sets the parking, shuttle and marshal tasks.",
  feeds: ["checklist"],
};

const CERTIFIED: VenueQuestion = {
  key: "capacity.certified",
  label: "Certified capacity",
  kind: "number",
  unit: "guests",
  min: 0,
  max: 20000,
  step: 10,
  consumer: "Caps the plan at what the venue is certified for.",
  feeds: ["solver"],
};

const CLEARSPAN: VenueQuestion = {
  key: "structure.clearspan",
  label: "Clear span",
  kind: "number",
  unit: "m",
  min: 0,
  max: 60,
  step: 0.5,
  consumer: "Sets the widest span a table row can cross.",
  feeds: ["solver"],
};

const LEG_MODULE: VenueQuestion = {
  key: "structure.legModule",
  label: "Leg spacing",
  kind: "select",
  options: [
    { value: "3", label: "3 m" },
    { value: "5", label: "5 m" },
  ],
  numeric: true,
  consumer: "Tables snap to the leg grid so nothing lands on a leg.",
  feeds: ["solver"],
};

const WIND_RATING: VenueQuestion = {
  key: "structure.designWindMph",
  label: "Design wind",
  kind: "number",
  unit: "mph",
  min: 0,
  max: 150,
  step: 5,
  consumer: "Sets the wind speed at which the plan is evacuated.",
  feeds: ["risk"],
};

const ANCHORING: VenueQuestion = {
  key: "structure.anchoring",
  label: "Anchoring",
  kind: "select",
  options: [
    { value: "stakes", label: "Stakes" },
    { value: "kentledge", label: "Kentledge" },
    { value: "ballast", label: "Ballast" },
    { value: "sand-anchors", label: "Sand anchors" },
  ],
  consumer: "Decides the anchoring and ground-test tasks.",
  feeds: ["checklist"],
};

const FLOOR: VenueQuestion = {
  key: "structure.floor",
  label: "Ground",
  kind: "select",
  options: [
    { value: "grass", label: "Grass" },
    { value: "gravel", label: "Gravel" },
    { value: "deck", label: "Deck" },
    { value: "soil", label: "Soil" },
    { value: "sand", label: "Sand" },
  ],
  consumer: "Changes the ground the renderer draws and the mud risk.",
  feeds: ["renderer", "risk"],
};

const WATER: VenueQuestion = {
  key: "services.water",
  label: "Water",
  kind: "select",
  options: [
    { value: "mains", label: "Mains" },
    { value: "tanker", label: "Tanker" },
  ],
  consumer: "Sets the water delivery task.",
  feeds: ["checklist"],
};

/** Weather is asked for every venue: it drives the sun, the wind and the thermal model. */
const WEATHER: QuestionGroup = {
  title: "Weather",
  questions: [
    {
      key: "climate.city",
      label: "City",
      kind: "text",
      placeholder: "Lagos",
      consumer: "Sets the sun position and the design temperature.",
      feeds: ["renderer", "thermal"],
    },
    {
      key: "climate.month",
      label: "Month",
      kind: "number",
      min: 1,
      max: 12,
      step: 1,
      consumer: "Moves the sun and the seasonal temperature.",
      feeds: ["renderer", "thermal"],
    },
    {
      key: "climate.outdoorC",
      label: "Outdoor temperature",
      kind: "number",
      unit: "°C",
      min: -10,
      max: 55,
      step: 1,
      consumer: "The starting point for the cooling load.",
      feeds: ["thermal"],
    },
    {
      key: "climate.rh",
      label: "Humidity",
      kind: "number",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      consumer: "Decides how much of the load is latent.",
      feeds: ["thermal"],
    },
    {
      key: "wind.direction",
      label: "Wind from",
      kind: "number",
      unit: "°",
      min: 0,
      max: 360,
      step: 15,
      consumer: "Places the wind indicator and the generator downwind.",
      feeds: ["renderer", "checklist"],
    },
    {
      key: "wind.speedMph",
      label: "Wind speed",
      kind: "number",
      unit: "mph",
      min: 0,
      max: 100,
      step: 1,
      consumer: "Compared with the design wind to raise a warning.",
      feeds: ["risk"],
    },
  ],
};

const HALL: QuestionGroup[] = [
  {
    title: "The room",
    questions: [CLEARSPAN, CERTIFIED],
  },
  {
    title: "Services",
    questions: [POWER, TOILETS, PARKING],
  },
];

const MARQUEE: QuestionGroup[] = [
  {
    title: "The structure",
    questions: [CLEARSPAN, LEG_MODULE, WIND_RATING, ANCHORING, FLOOR],
  },
  {
    title: "Services",
    questions: [GENERATOR, TOILETS, PARKING],
  },
];

const OUTDOOR: QuestionGroup[] = [
  {
    title: "The ground",
    questions: [FLOOR, WATER],
  },
  {
    title: "Services",
    questions: [GENERATOR, TOILETS, PARKING],
  },
];

const BEACH: QuestionGroup[] = [
  {
    title: "The shore",
    questions: [WIND_RATING, ANCHORING],
  },
  {
    title: "Services",
    questions: [GENERATOR, TOILETS, PARKING],
  },
];

const ROOFTOP: QuestionGroup[] = [
  {
    title: "The terrace",
    questions: [WIND_RATING, CERTIFIED],
  },
  {
    title: "Services",
    questions: [POWER, TOILETS],
  },
];

const CHURCH: QuestionGroup[] = [
  {
    title: "The church",
    questions: [CERTIFIED],
  },
  {
    title: "Services",
    questions: [POWER],
  },
];

const HYBRID: QuestionGroup[] = [
  {
    title: "Both venues",
    questions: [CERTIFIED],
  },
  {
    title: "Services",
    questions: [POWER, TOILETS, PARKING],
  },
];

/** The question set for each venue type, weather last. */
export const VENUE_QUESTIONS: Record<VenueType, QuestionGroup[]> = {
  hall: HALL,
  "pillared-hall": HALL,
  church: CHURCH,
  marquee: MARQUEE,
  "pole-tent": MARQUEE,
  "stretch-tent": MARQUEE,
  garden: OUTDOOR,
  field: OUTDOOR,
  beach: BEACH,
  rooftop: ROOFTOP,
  hybrid: HYBRID,
};

/** Every group for a type, with the shared weather group appended. */
export function questionsFor(type: VenueType): QuestionGroup[] {
  return [...VENUE_QUESTIONS[type], WEATHER];
}

/** Read a dotted path out of a venue profile. */
export function readVenueValue(
  venue: VenueProfile,
  key: string
): string | number | null {
  const [group, field] = key.split(".");
  const bag = venue[group as keyof VenueProfile];
  if (!bag || typeof bag !== "object") return null;
  const value = (bag as Record<string, unknown>)[field];
  return typeof value === "string" || typeof value === "number" ? value : null;
}

/**
 * Write a dotted path into a venue profile, creating the group when it is missing.
 *
 * An empty value clears the field to null rather than storing a blank string, so the document
 * stays honest about what the host has actually told us.
 */
export function writeVenueValue(
  venue: VenueProfile,
  key: string,
  value: string | number | null
): VenueProfile {
  const [group, field] = key.split(".");
  const bag = (venue[group as keyof VenueProfile] ?? {}) as Record<
    string,
    unknown
  >;
  return {
    ...venue,
    [group]: { ...bag, [field]: value === "" ? null : value },
  } as VenueProfile;
}

/**
 * The validator for one question, derived from the question itself.
 *
 * Deriving it means the bounds a field shows and the bounds it enforces are the same numbers, so
 * they cannot drift. A select whose stored value is a number validates as that number, which is
 * what catches a `"3"` written where `Structure.legModule` expects `3`.
 */
function schemaFor(question: VenueQuestion): z.ZodType {
  if (question.kind === "select") {
    const values = (question.options ?? []).map((option) =>
      question.numeric ? Number(option.value) : option.value
    );
    const [first, second, ...rest] = values.map((value) => z.literal(value));
    if (first === undefined || second === undefined) {
      throw new Error(
        `the select for ${question.key} needs at least two options`
      );
    }
    return z.union([first, second, ...rest]).nullable();
  }
  if (question.kind === "number") {
    let schema = z.number();
    if (question.min != null) schema = schema.min(question.min);
    if (question.max != null) schema = schema.max(question.max);
    return schema.nullable();
  }
  return z.string().max(120).nullable();
}

/**
 * The form schema for a venue type: one object per group the type asks about, built from the
 * shared field definitions. The shape mirrors `VenueProfile`, so a validated form is a profile.
 */
export function venueFormSchema(type: VenueType) {
  const groups: Record<string, Record<string, z.ZodType>> = {};
  for (const group of questionsFor(type)) {
    for (const question of group.questions) {
      const [name, field] = question.key.split(".");
      (groups[name] ??= {})[field] = schemaFor(question);
    }
  }
  return z.object(
    Object.fromEntries(
      Object.entries(groups).map(([name, fields]) => [
        name,
        z.object(fields).nullable(),
      ])
    )
  );
}

/**
 * The questions whose answer the profile does not satisfy, keyed by dotted path.
 *
 * Only the fields the type actually asks about are checked, so a value left over from a previous
 * venue type is not reported as an error the host cannot see.
 */
export function venueFormIssues(venue: VenueProfile): Record<string, string> {
  const parsed = venueFormSchema(venue.type).safeParse(venue);
  if (parsed.success) return {};
  const issues: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".");
    issues[key] ??= issue.message;
  }
  return issues;
}
