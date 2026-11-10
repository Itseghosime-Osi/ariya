import { describe, expect, it } from "vitest";
import { THEME_PALETTES } from "../design";
import { entrySealColours } from "./seal-contrast";
describe("entry seal readability", () => {
  for (const [name, palette] of Object.entries(THEME_PALETTES))
    it(`preserves ${name} unchanged`, () =>
      expect(entrySealColours(palette)).toEqual({
        paper: palette.paper,
        ink: palette.title,
        forcePlate: false,
      }));
  it("uses the existing dark ink when a custom title vanishes into the paper", () => {
    const palette = { ...THEME_PALETTES.royal_gold, title: "#fffaf0" };
    expect(entrySealColours(palette)).toEqual({
      paper: palette.paper,
      ink: palette.ink,
      forcePlate: true,
    });
    expect(palette.title).toBe("#fffaf0");
  });
  it("uses an ivory plate and dark ink for an inverted or unreadable palette", () =>
    expect(
      entrySealColours({
        ...THEME_PALETTES.royal_gold,
        paper: "#111111",
        ink: "#eeeeee",
        title: "#ffffff",
      })
    ).toEqual({ paper: "#fffaf0", ink: "#2a2118", forcePlate: true }));
  it("protects the seal over a dark paper gradient edge", () =>
    expect(
      entrySealColours({ ...THEME_PALETTES.royal_gold, paperEdge: "#111111" })
        .forcePlate
    ).toBe(true));
});
