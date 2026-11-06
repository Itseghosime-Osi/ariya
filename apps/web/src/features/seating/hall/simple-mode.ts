import type {
  AlcoholAnswer,
  CakeAnswer,
  CateringStyle,
  Environment,
  VenueType,
} from "@ariya/studio";
import type { HallLayout } from "./model";
import { normaliseCatering, type CateringAnswers } from "./catering";

/**
 * Simple mode (7.1): six questions a couple can answer without a floor plan, and the plan they
 * produce.
 *
 * The point of this file is that Simple mode is not a second model. Every answer maps onto a field
 * the studio already reads — `venue.type`, `venue.environment`, the catering block, the layout's
 * mood — so a plan made in Simple mode opens in Studio mode with nothing lost, and a host can
 * switch back and forth (7.2). What Simple mode owns is the *choice of questions* and the words;
 * everything downstream is the same document.
 */

export type ServiceStyle = "seated" | "cocktail" | "ceremony";
export type TimeOfDay = "afternoon" | "evening";

export interface SimpleAnswers {
  /** 1. What kind of venue? */
  venueType: VenueType;
  /** 2. How many guests? */
  guests: number;
  /** 3. Seated dinner, cocktail, or ceremony? */
  service: ServiceStyle;
  /** 4. Indoor, covered, or open air? */
  environment: Environment;
  /** 5. What time of day? */
  timeOfDay: TimeOfDay;
  /** 6a. Will you serve alcohol? */
  alcohol: AlcoholAnswer;
  /** 6b. Is the cake dessert or decoration? */
  cake: CakeAnswer;
}

/**
 * A wedding is the case the questions were written for, and the defaults are a Nigerian
 * reception: a hall, 200 guests, a seated dinner, evening, beer and wine, a ceremonial cake.
 */
export function defaultSimpleAnswers(): SimpleAnswers {
  return {
    venueType: "hall",
    guests: 200,
    service: "seated",
    environment: "indoor",
    timeOfDay: "evening",
    alcohol: "beer-wine",
    cake: "ceremonial",
  };
}

/** The catering style a service style means to the kitchen. */
export function cateringStyleOf(service: ServiceStyle): CateringStyle {
  if (service === "cocktail") return "cocktail";
  if (service === "ceremony") return "buffet";
  return "plated";
}

/**
 * A ceremony is not a meal. Plated numbers would tell a host to order dinner for a church service,
 * so the engine is asked for shorter quantities at ceremony length — enough for refreshments
 * without pretending it is a reception.
 */
export function hoursOf(service: ServiceStyle): number {
  if (service === "cocktail") return 3;
  if (service === "ceremony") return 2;
  return 5;
}

/** The six answers as the catering block the studio stores. */
export function cateringFromSimple(answers: SimpleAnswers): CateringAnswers {
  return normaliseCatering({
    style: cateringStyleOf(answers.service),
    hours: hoursOf(answers.service),
    alcohol: answers.alcohol,
    cake: answers.cake,
    // A seated dinner is the case where a plate of takeaway at the end is expected; a cocktail
    // hour does not produce one.
    takeaway: answers.service === "seated",
    // Hot weather is the default the studio already assumes for Nigeria, and Simple mode does not
    // ask a question whose answer the month usually gives.
    hotWeather: true,
  });
}

/**
 * The plan the six answers produce: the venue facts and the layout's mood, merged into whatever
 * document the event already had.
 *
 * Everything the studio owns beyond these answers — the hall's metres, its zones, the décor, the
 * table styles, any cooling the host planned — is carried across untouched. Simple mode sets only
 * what it asked about, which is what makes switching modes lossless in both directions.
 */
export function applySimpleAnswers(
  layout: HallLayout,
  answers: SimpleAnswers
): HallLayout {
  return {
    ...layout,
    // Evening is the studio's existing mood value; it drives the render, not the numbers.
    mood: answers.timeOfDay === "evening" ? "evening" : "day",
    venue: {
      ...layout.venue,
      type: answers.venueType,
      environment: answers.environment,
      catering: {
        ...(layout.venue.catering ?? {}),
        ...cateringFromSimple(answers),
      },
    },
  };
}

/** What the simple answers say the event will seat, which the hall may not agree with. */
export function guestsFromSimple(answers: SimpleAnswers): number {
  return Math.max(1, Math.round(answers.guests));
}

/** The venue cards, as pictures rather than a dropdown (research §I.1). */
export const VENUE_CARDS: { key: VenueType; label: string; blurb: string }[] = [
  { key: "hall", label: "Hall", blurb: "A room with walls and a roof" },
  {
    key: "pillared-hall",
    label: "Pillared hall",
    blurb: "Columns you have to seat around",
  },
  { key: "marquee", label: "Marquee", blurb: "A tent on a lawn or terrace" },
  {
    key: "pole-tent",
    label: "Pole tent",
    blurb: "Open sides, poles in the middle",
  },
  {
    key: "stretch-tent",
    label: "Stretch tent",
    blurb: "A curved roof, no poles inside",
  },
  { key: "garden", label: "Garden", blurb: "Outdoors, under trees and sky" },
  {
    key: "field",
    label: "Open field",
    blurb: "Flat ground with nothing built on it",
  },
  { key: "beach", label: "Beach", blurb: "Sand, wind and a view" },
  { key: "rooftop", label: "Rooftop", blurb: "Up high, often with a view" },
  {
    key: "church",
    label: "Church",
    blurb: "Pews, and ceremony rather than dinner",
  },
  {
    key: "hybrid",
    label: "Two venues",
    blurb: "Ceremony in one place, reception in another",
  },
];

export const SERVICE_CARDS: {
  key: ServiceStyle;
  label: string;
  blurb: string;
}[] = [
  {
    key: "seated",
    label: "Seated dinner",
    blurb: "Everyone gets a table and a plate",
  },
  {
    key: "cocktail",
    label: "Cocktail",
    blurb: "Standing, small plates, moving about",
  },
  { key: "ceremony", label: "Ceremony", blurb: "A service rather than a meal" },
];

export const ENVIRONMENT_CARDS: {
  key: Environment;
  label: string;
  blurb: string;
}[] = [
  {
    key: "indoor",
    label: "Indoor",
    blurb: "Walls, roof, can be cooled properly",
  },
  {
    key: "covered",
    label: "Covered",
    blurb: "A roof over you, but open at the sides",
  },
  {
    key: "outdoor",
    label: "Open air",
    blurb: "No roof at all — the weather decides",
  },
];

/**
 * The venue types whose natural setting is open air, so question 4 starts on the honest answer
 * rather than making a garden look like a hall.
 */
export function defaultEnvironmentFor(venueType: VenueType): Environment {
  if (
    venueType === "garden" ||
    venueType === "field" ||
    venueType === "beach" ||
    venueType === "rooftop"
  ) {
    return "outdoor";
  }
  if (
    venueType === "marquee" ||
    venueType === "pole-tent" ||
    venueType === "stretch-tent"
  ) {
    return "covered";
  }
  return "indoor";
}
