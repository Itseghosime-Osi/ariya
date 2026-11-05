import { describe, expect, it } from "vitest";

import type { VenueProfile, VenueType } from "@ariya/studio";

import {
  CONSUMERS,
  VENUE_QUESTIONS,
  questionsFor,
  readVenueValue,
  venueFormIssues,
  venueFormSchema,
  writeVenueValue,
  type VenueQuestion,
} from "./venue-questions";

const TYPES = Object.keys(VENUE_QUESTIONS) as VenueType[];

/** The groups and fields `VenueProfile` actually has, so a typo in a key is caught. */
const PROFILE_FIELDS: Record<string, string[]> = {
  structure: ["clearspan", "legModule", "designWindMph", "anchoring", "floor"],
  services: ["power", "generatorKva", "water", "toilets", "parking"],
  capacity: ["certified", "source"],
  climate: ["city", "month", "outdoorC", "rh"],
  sun: ["azimuth", "elevation"],
  wind: ["direction", "speedMph"],
};

function allQuestions(): VenueQuestion[] {
  return TYPES.flatMap((type) =>
    questionsFor(type).flatMap((group) => group.questions)
  );
}

function profile(overrides: Partial<VenueProfile> = {}): VenueProfile {
  return {
    type: "marquee",
    environment: "covered",
    structure: null,
    services: null,
    capacity: null,
    climate: null,
    sun: null,
    wind: null,
    ...overrides,
  };
}

describe("the question set", () => {
  it("asks every type something, and always asks about the weather", () => {
    for (const type of TYPES) {
      const groups = questionsFor(type);
      expect(groups.length).toBeGreaterThan(1);
      expect(groups.at(-1)?.title).toBe("Weather");
    }
  });

  it("gives every question a consumer in prose and in structure", () => {
    for (const question of allQuestions()) {
      expect(question.consumer.trim(), question.key).not.toBe("");
      expect(question.feeds.length, question.key).toBeGreaterThan(0);
    }
  });

  it("only names consumers the studio actually has", () => {
    for (const question of allQuestions()) {
      for (const feed of question.feeds) {
        expect(CONSUMERS, question.key).toContain(feed);
      }
    }
  });

  it("feeds each of the solver, thermal, risk and checklist at least once", () => {
    const fed = new Set(allQuestions().flatMap((q) => q.feeds));
    for (const consumer of [
      "solver",
      "thermal",
      "risk",
      "checklist",
    ] as const) {
      expect(fed, `nothing feeds the ${consumer}`).toContain(consumer);
    }
  });

  it("points every question at a field the profile has", () => {
    for (const question of allQuestions()) {
      const [group, field] = question.key.split(".");
      expect(PROFILE_FIELDS[group], question.key).toBeDefined();
      expect(PROFILE_FIELDS[group], question.key).toContain(field);
    }
  });

  it("asks no question twice for the same type", () => {
    for (const type of TYPES) {
      const keys = questionsFor(type).flatMap((g) =>
        g.questions.map((q) => q.key)
      );
      expect(new Set(keys).size, type).toBe(keys.length);
    }
  });
});

describe("the form schema", () => {
  it("accepts a profile with nothing filled in", () => {
    expect(venueFormSchema("marquee").safeParse(profile()).success).toBe(true);
  });

  it("accepts answers inside the bounds the field shows", () => {
    const filled = profile({
      structure: {
        clearspan: 12,
        legModule: 3,
        designWindMph: 45,
        anchoring: "kentledge",
        floor: "grass",
      },
      services: {
        power: "generator",
        generatorKva: 60,
        water: "tanker",
        toilets: 12,
        parking: 80,
      },
      climate: { city: "Lagos", month: 11, outdoorC: 31, rh: 75 },
      wind: { direction: 210, speedMph: 12 },
    });
    expect(venueFormSchema("marquee").safeParse(filled).success).toBe(true);
  });

  it("rejects a number outside the bounds the field shows", () => {
    const tooWide = profile({
      structure: {
        clearspan: 90,
        legModule: null,
        designWindMph: null,
        anchoring: null,
        floor: null,
      },
    });
    const result = venueFormSchema("marquee").safeParse(tooWide);
    expect(result.success).toBe(false);
  });

  it("rejects a leg module that is not one of the offered modules", () => {
    const odd = profile({
      structure: {
        clearspan: null,
        legModule: 4,
        designWindMph: null,
        anchoring: null,
        floor: null,
      },
    });
    expect(venueFormSchema("marquee").safeParse(odd).success).toBe(false);
  });

  it("rejects a leg module stored as a string", () => {
    const stringy = profile({
      structure: {
        clearspan: null,
        legModule: "3" as unknown as number,
        designWindMph: null,
        anchoring: null,
        floor: null,
      },
    });
    expect(venueFormSchema("marquee").safeParse(stringy).success).toBe(false);
  });

  it("rejects a select value that is not offered", () => {
    const invented = profile({
      structure: {
        clearspan: null,
        legModule: null,
        designWindMph: null,
        anchoring: "hamster wheel",
        floor: null,
      },
    });
    expect(venueFormSchema("marquee").safeParse(invented).success).toBe(false);
  });

  it("does not police a field the type never asks about", () => {
    // A hall is never asked for a leg module, so a stale one is not an error the host can see.
    const stale = profile({
      type: "hall",
      environment: "indoor",
      structure: {
        clearspan: null,
        legModule: 4,
        designWindMph: null,
        anchoring: null,
        floor: null,
      },
    });
    expect(venueFormSchema("hall").safeParse(stale).success).toBe(true);
  });
});

describe("venueFormIssues", () => {
  it("reports nothing for a clean profile", () => {
    expect(venueFormIssues(profile())).toEqual({});
  });

  it("keys the issue by the dotted path the field uses", () => {
    const tooWide = profile({
      structure: {
        clearspan: 90,
        legModule: null,
        designWindMph: null,
        anchoring: null,
        floor: null,
      },
    });
    expect(Object.keys(venueFormIssues(tooWide))).toContain(
      "structure.clearspan"
    );
  });
});

describe("reading and writing a dotted path", () => {
  it("round-trips a value", () => {
    const written = writeVenueValue(profile(), "structure.clearspan", 12);
    expect(readVenueValue(written, "structure.clearspan")).toBe(12);
  });

  it("clears a field to null rather than storing a blank string", () => {
    const written = writeVenueValue(profile(), "climate.city", "");
    expect(readVenueValue(written, "climate.city")).toBeNull();
  });

  it("creates the group when the profile has none", () => {
    const written = writeVenueValue(profile(), "services.toilets", 8);
    expect(written.services?.toilets).toBe(8);
  });
});
