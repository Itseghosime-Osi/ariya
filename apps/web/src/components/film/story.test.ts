import { describe, expect, it } from "vitest";
import {
  FILM_SECONDS,
  OPEN_LINES,
  OPEN_SFX,
  createJsMap,
  songLevel,
} from "./story";

const map = createJsMap();

function sceneSeconds(mode: "R" | "M" | "N") {
  return (
    map.tFromS(map.sFromScene(mode, 1)) - map.tFromS(map.sFromScene(mode, 0))
  );
}

describe("the film's pacing", () => {
  it("takes about two minutes forty at 1x", () => {
    expect(map.totalTime()).toBeCloseTo(FILM_SECONDS, 1);
    expect(FILM_SECONDS).toBeGreaterThan(150);
  });

  it("gives every caption time to be read", () => {
    const tooShort: string[] = [];
    for (const [mode, from, to, , line, kind] of OPEN_LINES) {
      if (mode !== "R" && mode !== "M" && mode !== "N") continue;
      const seconds = (to - from) * sceneSeconds(mode);
      const need = kind === "sfx" ? 1.3 : 1.1 + 0.055 * line.length;
      if (seconds < need - 0.05) {
        tooShort.push(
          `${mode} "${line}" ${seconds.toFixed(2)}s < ${need.toFixed(2)}s`
        );
      }
    }
    expect(tooShort).toEqual([]);
  });

  it("never shows two captions at once", () => {
    for (const mode of ["R", "M", "N"] as const) {
      const lines = OPEN_LINES.filter((l) => l[0] === mode).sort(
        (a, b) => a[1] - b[1]
      );
      for (let i = 1; i < lines.length; i += 1) {
        expect(lines[i][1]).toBeGreaterThanOrEqual(lines[i - 1][2]);
      }
    }
  });

  it("puts the hinge after the room is lit again, so the lid can open in view", () => {
    const hinge = OPEN_SFX.find((s) => s[2] === "hinge");
    expect(hinge?.[0]).toBe("N");
    // The blackout lifts by 0.6 of the question scene.
    expect(hinge?.[1]).toBeGreaterThanOrEqual(0.6);
  });

  it("keeps the song soft until the guests are dancing", () => {
    // Getting ready, the morning and the place kept all sit at the same story progress (0.885).
    for (const mode of [
      "R",
      "M",
      "N",
      "C",
      "G",
      "E",
      "F",
      "W",
      "J",
      "H",
      "T",
    ] as const) {
      expect(songLevel(mode, 0.885, 1)).toBeCloseTo(0.2, 5);
    }
    expect(songLevel("old", 0.5, 1)).toBeCloseTo(0.2, 5);
    expect(songLevel("old", 0.93, 1)).toBeCloseTo(0.2, 5);
    expect(songLevel("old", 0.96, 1)).toBeCloseTo(0.2, 5);
    expect(songLevel("old", 0.98, 1)).toBeGreaterThan(0.5);
    expect(songLevel("old", 0.99, 1)).toBeCloseTo(1, 5);
    expect(songLevel("D", 1, 1)).toBe(1);
    expect(songLevel("old", 0.99, 0.5)).toBeCloseTo(0.2, 5);
  });
});
