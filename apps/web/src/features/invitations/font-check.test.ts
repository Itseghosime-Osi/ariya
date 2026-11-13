import { afterEach, describe, expect, it } from "vitest";
import { failedCardFonts, missingFontMessage } from "./font-check";

const fonts = (faces: { family: string; status: string }[]) =>
  ({
    forEach: (cb: (f: FontFace) => void) =>
      faces.forEach((f) => cb(f as unknown as FontFace)),
  }) as unknown as Pick<FontFaceSet, "forEach">;

function card(html: string) {
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("failedCardFonts", () => {
  it("reports a failed font that the card uses", () => {
    const c = card(
      `<p style="font-family: 'Bodoni Moda', serif">Adaeze</p><p style="font-family: Arial">date</p>`
    );
    expect(
      failedCardFonts(
        c,
        fonts([
          { family: '"Bodoni Moda"', status: "error" },
          { family: "Great Vibes", status: "error" },
          { family: "Plus Jakarta Sans", status: "loaded" },
        ])
      )
    ).toEqual(["Bodoni Moda"]);
  });

  it("ignores the generated fallback faces", () => {
    const c = card(
      `<p style="font-family: 'Bodoni Moda', 'Bodoni Moda Fallback', serif">Adaeze</p>`
    );
    expect(
      failedCardFonts(
        c,
        fonts([
          { family: '"Bodoni Moda"', status: "error" },
          { family: '"Bodoni Moda Fallback"', status: "error" },
        ])
      )
    ).toEqual(["Bodoni Moda"]);
  });

  it("says nothing when every font loaded or nothing failed is used", () => {
    const c = card(`<p style="font-family: Arial">date</p>`);
    expect(
      failedCardFonts(c, fonts([{ family: "Great Vibes", status: "error" }]))
    ).toEqual([]);
    expect(
      failedCardFonts(c, fonts([{ family: "A", status: "loaded" }]))
    ).toEqual([]);
    expect(failedCardFonts(null, fonts([]))).toEqual([]);
  });
});

describe("missingFontMessage", () => {
  it("names the font and says what to do", () => {
    const m = missingFontMessage(["Bodoni Moda"]);
    expect(m).toMatch(/Bodoni Moda/);
    expect(m).toMatch(/export again/i);
  });
});
