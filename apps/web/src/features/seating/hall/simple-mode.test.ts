import { describe, expect, it } from "vitest";
import { defaultLayout } from "./model";
import {
  applySimpleAnswers,
  cateringFromSimple,
  cateringStyleOf,
  defaultEnvironmentFor,
  defaultSimpleAnswers,
  guestsFromSimple,
  hoursOf,
} from "./simple-mode";

describe("the six answers map onto the document the studio already reads", () => {
  it("sets the venue type and its environment", () => {
    const layout = defaultLayout();
    const next = applySimpleAnswers(layout, {
      ...defaultSimpleAnswers(),
      venueType: "garden",
      environment: "outdoor",
    });

    expect(next.venue.type).toBe("garden");
    expect(next.venue.environment).toBe("outdoor");
  });

  it("carries the time of day onto the layout's mood", () => {
    const layout = defaultLayout();
    expect(applySimpleAnswers(layout, defaultSimpleAnswers()).mood).toBe(
      "evening"
    );
    expect(
      applySimpleAnswers(layout, {
        ...defaultSimpleAnswers(),
        timeOfDay: "afternoon",
      }).mood
    ).toBe("day");
  });

  it("writes the alcohol and cake answers into the catering block", () => {
    const next = applySimpleAnswers(defaultLayout(), {
      ...defaultSimpleAnswers(),
      alcohol: "none",
      cake: "decoration",
    });

    expect(next.venue.catering?.alcohol).toBe("none");
    expect(next.venue.catering?.cake).toBe("decoration");
  });

  it("leaves everything it did not ask about untouched", () => {
    const layout = defaultLayout();
    const next = applySimpleAnswers(layout, defaultSimpleAnswers());

    // The hall's metres, zones, décor and table styles are the studio's, not the six answers'.
    expect(next.width).toBe(layout.width);
    expect(next.length).toBe(layout.length);
    expect(next.ceiling).toBe(layout.ceiling);
    expect(next.zones).toEqual(layout.zones);
    expect(next.decor).toEqual(layout.decor);
    expect(next.tableStyles).toEqual(layout.tableStyles);
  });

  it("keeps cooling the host planned in Studio mode when Simple mode saves", () => {
    const layout = defaultLayout();
    const withCooling = {
      ...layout,
      venue: {
        ...layout.venue,
        cooling: { units: [], ach: 8, targetC: 24 },
      },
    };
    const next = applySimpleAnswers(withCooling, defaultSimpleAnswers());

    expect(next.venue.cooling).toEqual({ units: [], ach: 8, targetC: 24 });
  });
});

describe("a service style reaches the kitchen as a catering style", () => {
  it("maps each service to the style and length it means", () => {
    expect(cateringStyleOf("seated")).toBe("plated");
    expect(cateringStyleOf("cocktail")).toBe("cocktail");
    expect(cateringStyleOf("ceremony")).toBe("buffet");
  });

  it("asks for a shorter event when there is no dinner", () => {
    expect(hoursOf("seated")).toBe(5);
    expect(hoursOf("cocktail")).toBe(3);
    expect(hoursOf("ceremony")).toBe(2);
    expect(hoursOf("ceremony")).toBeLessThan(hoursOf("seated"));
  });

  it("gives takeaway only to a seated dinner", () => {
    expect(
      cateringFromSimple({ ...defaultSimpleAnswers(), service: "seated" })
        .takeaway
    ).toBe(true);
    expect(
      cateringFromSimple({ ...defaultSimpleAnswers(), service: "cocktail" })
        .takeaway
    ).toBe(false);
  });
});

describe("the guest count", () => {
  it("is the number typed, rounded and never zero", () => {
    expect(guestsFromSimple({ ...defaultSimpleAnswers(), guests: 180 })).toBe(
      180
    );
    expect(guestsFromSimple({ ...defaultSimpleAnswers(), guests: 180.6 })).toBe(
      181
    );
    expect(guestsFromSimple({ ...defaultSimpleAnswers(), guests: 0 })).toBe(1);
    expect(guestsFromSimple({ ...defaultSimpleAnswers(), guests: -5 })).toBe(1);
  });
});

describe("the environment a venue naturally has", () => {
  it("starts open-air venues on open air, not on indoor", () => {
    expect(defaultEnvironmentFor("garden")).toBe("outdoor");
    expect(defaultEnvironmentFor("beach")).toBe("outdoor");
    expect(defaultEnvironmentFor("field")).toBe("outdoor");
    expect(defaultEnvironmentFor("rooftop")).toBe("outdoor");
  });

  it("starts tents on covered, because a tent has a roof and no walls", () => {
    expect(defaultEnvironmentFor("marquee")).toBe("covered");
    expect(defaultEnvironmentFor("pole-tent")).toBe("covered");
    expect(defaultEnvironmentFor("stretch-tent")).toBe("covered");
  });

  it("starts walled venues indoors", () => {
    expect(defaultEnvironmentFor("hall")).toBe("indoor");
    expect(defaultEnvironmentFor("pillared-hall")).toBe("indoor");
    expect(defaultEnvironmentFor("church")).toBe("indoor");
  });
});
