import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import QRCode from "qrcode";
import { THEME_PALETTES } from "../design";
import { EntrySeal, SAMPLE_ENTRY_CODE } from "./EntrySeal";
describe("entry seal signal geometry", () => {
  it.each([SAMPLE_ENTRY_CODE, "ARY-LOCAL-ACCEPTED-GUEST-EXAMPLE"])(
    "keeps a complete four-module quiet zone outside the symbol (%s)",
    (value) => {
      const model = QRCode.create(value, { errorCorrectionLevel: "H" });
      const { container } = render(
        <EntrySeal value={value} palette={THEME_PALETTES.royal_gold} />
      );
      const nearestOrnament = container.querySelector(
        "circle[stroke-dasharray]"
      )!;
      const clearCornerDistance = (model.modules.size / 2 + 4) * Math.SQRT2;
      expect(Number(nearestOrnament.getAttribute("r"))).toBeGreaterThan(
        clearCornerDistance
      );
      const modules = container.querySelector("svg > g")!;
      const squares = Array.from(modules.children).filter(
        (element) => element.tagName.toLowerCase() === "rect"
      );
      expect(squares.length).toBeGreaterThan(0);
      for (const square of squares) {
        const row = Number(square.getAttribute("y")),
          col = Number(square.getAttribute("x"));
        expect(Boolean(model.modules.get(row, col))).toBe(true);
        expect(Boolean(model.modules.isReserved(row, col))).toBe(true);
      }
    }
  );
});
