// The film's timeline, in TypeScript. Ported from the archive's
// public/site/assets/the-yes-controls.*.js, where the same numbers run as the
// fallback while the Rust renderer loads. Both maps are pinned to the same
// values; `@ariya/render` takes over when the WASM arrives.

export type ModeName =
  "R" | "M" | "N" | "old" | "C" | "G" | "E" | "F" | "W" | "J" | "H" | "T" | "D";

export interface SceneState {
  mode: ModeName;
  p: number;
  local: number;
  fade: number;
  vis: number;
  cut: number;
}

export interface Cut {
  mode: ModeName;
  a: number;
  b: number;
  p0: number;
  p1: number;
  t0: number;
  t1: number;
  scrollSec: number;
}

/** The share of the scroll given to the prologue; the gate leads straight into the opening. */
export const PRO = 0.004;

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function smooth(x: number) {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

export function seg(p: number, a: number, b: number) {
  return smooth((p - a) / (b - a));
}

export function bump(p: number, a: number, b: number, c: number, d: number) {
  return seg(p, a, b) * (1 - seg(p, c, d));
}

// The original eight chapters run on "p" (0 to 1, the box to the dance); the newer
// chapters are cut in between them, each with its own 0 to 1 progress.
const SEGS: ReadonlyArray<ReadonlyArray<string | number>> = [
  ["R", 0.2],
  ["M", 0.12],
  ["N", 0.68],
  ["old", 0.1, 0.285],
  ["C", 0.13],
  ["G", 0.11],
  ["old", 0.285, 0.475],
  ["E", 0.24],
  ["old", 0.475, 0.62],
  ["F", 0.12],
  ["old", 0.62, 0.675],
  ["W", 0.1],
  ["old", 0.675, 0.885],
  ["J", 0.11],
  ["H", 0.1],
  ["T", 0.09],
  ["old", 0.885, 1],
  ["D", 0.19],
];

// The film takes 2:29 at 1x and ends while the song (2:41) still has its last bars, which play
// out and fade. The dance falls where the song is full. The dialogue scenes (the room, the memory, the question) get the time
// their captions need to be read; the chapters between them share the rest. The song is not what
// sets the length. Pinned to crates/render-core/src/story.rs.
export const FILM_SECONDS = 149;
const SEG_SECONDS = [
  16, 8.5, 44, 5.5, 5, 5, 6, 5, 4.5, 4.5, 3.5, 5, 5, 4.5, 5, 5, 8, 9,
];
const SCROLL_SECONDS = [
  6, 5, 15, 7, 5, 5, 6, 7, 5, 5, 3.5, 4.5, 7, 6, 4.5, 4.5, 6, 7,
];

const CUT_W = 0.011; // half-width of the dip to black at a cut, in s

function buildCuts(): { cuts: Cut[]; totalTime: number } {
  const raw: Array<
    Omit<Cut, "a" | "b" | "t0" | "t1" | "scrollSec"> & {
      a: number;
      b: number;
    }
  > = [];
  let acc = 0;
  let lastP = 0;
  for (const g of SEGS) {
    const isOld = g[0] === "old";
    const w = isOld
      ? 0.68 * ((g[2] as number) - (g[1] as number))
      : (g[1] as number);
    raw.push({
      mode: g[0] as ModeName,
      a: acc,
      b: acc + w,
      p0: isOld ? (g[1] as number) : lastP,
      p1: isOld ? (g[2] as number) : lastP,
    });
    if (isOld) lastP = g[2] as number;
    acc += w;
  }

  const segSum = SEG_SECONDS.reduce((x, y) => x + y, 0);
  let t = 0;
  const cuts = raw.map((c, i) => {
    const t0 = t;
    t += (SEG_SECONDS[i] * FILM_SECONDS) / segSum;
    return {
      mode: c.mode,
      a: c.a / acc,
      b: c.b / acc,
      p0: c.p0,
      p1: c.p1,
      t0,
      t1: t,
      scrollSec: SCROLL_SECONDS[i],
    };
  });
  return { cuts, totalTime: t };
}

const BUILT = buildCuts();

/**
 * The map as the archive had it in JavaScript, before the Rust engine loads.
 * `replace` lets a loaded engine take over, exactly as the archive did.
 */
export function createJsMap() {
  const cuts = BUILT.cuts;
  let totalTime = BUILT.totalTime;

  const map = {
    sceneAt(sv: number): SceneState {
      let c = cuts[cuts.length - 1];
      let ci = cuts.length - 1;
      for (let i = 0; i < cuts.length; i += 1) {
        if (sv <= cuts[i].b) {
          c = cuts[i];
          ci = i;
          break;
        }
      }
      const k = c.b > c.a ? clamp((sv - c.a) / (c.b - c.a), 0, 1) : 0;
      let near = 1;
      for (let j = 1; j < cuts.length; j += 1) {
        near = Math.min(near, Math.abs(sv - cuts[j].a) / CUT_W);
      }
      const dip = near < 1 ? 1 - near * near * (3 - 2 * near) : 0;
      // No dip to black at a cut: the picture dissolves from one shot into the
      // next; the words still ease out.
      return {
        mode: c.mode,
        p: c.p0 + (c.p1 - c.p0) * k,
        local: k,
        fade: 0,
        vis: 1 - dip,
        cut: ci,
      };
    },

    sFromOld(p: number) {
      for (const c of cuts) {
        if (c.mode === "old" && p <= c.p1) {
          return c.a + (c.b - c.a) * Math.max(0, (p - c.p0) / (c.p1 - c.p0));
        }
      }
      return cuts[cuts.length - 2].b;
    },

    sFromScene(mode: ModeName, k: number) {
      const cut = cuts.find((c) => c.mode === mode);
      return cut ? cut.a + (cut.b - cut.a) * k : 0;
    },

    rawFromS(sv: number) {
      return PRO + sv * (1 - PRO);
    },

    tFromS(sv: number) {
      for (const c of cuts) {
        if (sv <= c.b) {
          return c.t0 + (c.t1 - c.t0) * clamp((sv - c.a) / (c.b - c.a), 0, 1);
        }
      }
      return totalTime;
    },

    sFromT(t: number) {
      for (const c of cuts) {
        if (t <= c.t1) {
          return c.a + (c.b - c.a) * clamp((t - c.t0) / (c.t1 - c.t0), 0, 1);
        }
      }
      return 1;
    },

    cutCount: () => cuts.length,
    totalTime: () => totalTime,

    /** Hands the per-frame math to the Rust renderer without changing the screen. */
    replace(engine: StoryMap) {
      map.sceneAt = engine.sceneAt;
      map.sFromOld = engine.sFromOld;
      map.sFromScene = engine.sFromScene;
      map.rawFromS = engine.rawFromS;
      map.tFromS = engine.tFromS;
      map.sFromT = engine.sFromT;
      totalTime = engine.totalTime();
    },
  };

  return map;
}

export type StoryMap = {
  sceneAt: (s: number) => SceneState;
  sFromOld: (p: number) => number;
  sFromScene: (mode: ModeName, k: number) => number;
  rawFromS: (s: number) => number;
  tFromS: (s: number) => number;
  sFromT: (t: number) => number;
  cutCount: () => number;
  totalTime: () => number;
  replace: (engine: StoryMap) => void;
};

/** [name, story position s]; the prologue is -1 (the very top). */
export function chaptersOf(map: StoryMap): Array<[string, number]> {
  return [
    ["The words", -1],
    ["Where it began", map.sFromScene("M", 0)],
    ["The question", map.sFromScene("N", 0)],
    ["The colour", map.sFromScene("C", 0)],
    ["The weave", map.sFromScene("G", 0.02)],
    ["The noise", map.sFromOld(0.37)],
    ["Mama", map.sFromScene("E", 0.02)],
    ["The calm", map.sFromOld(0.53)],
    ["Her name", map.sFromScene("F", 0.02)],
    ["The doors", map.sFromScene("W", 0.0)],
    ["The invitation", map.sFromOld(0.72)],
    ["The count", map.sFromOld(0.83)],
    ["Getting ready", map.sFromScene("J", 0.02)],
    ["The morning", map.sFromScene("H", 0.02)],
    ["The place kept", map.sFromScene("T", 0.02)],
    ["The dance", map.sFromOld(0.97)],
    ["The send-off", map.sFromScene("D", 0.02)],
  ];
}

/** The colour of the day, and the words the chapter titles use for it. */
export const HUES: Record<string, [string, string]> = {
  burgundy: ["Burgundy", "gold."],
  blue: ["Sapphire", "gold."],
  green: ["Green", "champagne."],
  ruby: ["Ruby", "gold."],
  coral: ["Coral", "gold."],
};

/**
 * The opening: one set of scene definitions drives the captions, the words on
 * screen, the sounds, the blackout and the autoplay, whether the visitor
 * watches it play or scrolls through it.
 * [scene, from, to, speaker, line, kind] — kind "sfx" for described sounds.
 */
export const OPEN_LINES: ReadonlyArray<
  readonly [ModeName, number, number, string, string, string?]
> = [
  ["R", 0.05, 0.25, "Tunde, quietly", "Chidinma… these past five years…"],
  ["R", 0.27, 0.37, "", "[paper rustles]", "sfx"],
  ["R", 0.385, 0.61, "Tunde", "Why does that sound like a graduation speech?"],
  ["R", 0.625, 0.72, "", "[a small, nervous laugh]", "sfx"],
  ["R", 0.74, 0.95, "Tunde", "Since that night at table fourteen…"],
  ["M", 0.08, 0.46, "Chidinma", "That's enough rice for three people."],
  ["M", 0.48, 0.76, "Tunde", "I'm planning ahead."],
  ["M", 0.77, 0.97, "", "[her laugh]", "sfx"],
  ["N", 0.1, 0.165, "Chidinma", "You kept this?"],
  ["N", 0.17, 0.24, "Tunde", "Of course."],
  ["N", 0.265, 0.315, "Tunde", "Close your eyes."],
  ["N", 0.32, 0.38, "Chidinma, amused", "Tunde… what are you doing?"],
  ["N", 0.385, 0.425, "Tunde, gently", "Please."],
  ["N", 0.445, 0.475, "", "[a chair moves]", "sfx"],
  ["N", 0.478, 0.508, "", "[fabric, a breath]", "sfx"],
  ["N", 0.51, 0.54, "", "[something set down]", "sfx"],
  ["N", 0.545, 0.6, "Tunde", "Okay. Open."],
  ["N", 0.62, 0.66, "", "[a soft hinge]", "sfx"],
  ["N", 0.705, 0.76, "Tunde", "I had a whole speech."],
  ["N", 0.765, 0.8, "Chidinma", "I know."],
  ["N", 0.81, 0.86, "Tunde", "Will you marry me?"],
  ["N", 0.875, 0.915, "Chidinma, with a small laugh", "Yes."],
];

export const OPEN_SLATES: ReadonlyArray<
  readonly [ModeName, number, number, string]
> = [
  ["R", 0.0, 0.3, "Tunde's room · Lagos · late 2026"],
  ["M", 0.0, 0.95, "Lagos · December 2021"],
  ["N", 0.0, 0.16, "Five years later · dinner for two"],
];

/** After the yes, the ring rises out of its box, then the thread leads on. */
export const OPEN_WORDS: ReadonlyArray<
  readonly [ModeName | "L", number, number, string]
> = [
  ["N", 0.89, 1.01, "It starts with <em>one yes.</em>"],
  ["L", 0.8, 1.01, "Now tell everyone who <em>helped you get here.</em>"],
];

/** Sounds, by the same clock. They only play once the visitor has turned sound on. */
export const OPEN_SFX: ReadonlyArray<readonly [ModeName, number, string]> = [
  ["R", 0.27, "paper"],
  ["R", 0.63, "breath"],
  ["R", 0.74, "paper"],
  ["M", 0.52, "clink"],
  ["N", 0.445, "chair"],
  ["N", 0.478, "fabric"],
  ["N", 0.49, "breath"],
  ["N", 0.508, "set"],
  ["N", 0.62, "hinge"],
  ["N", 0.79, "breath"],
];

/** The noise: the group chat, each bubble at its own depth. */
export const MESSAGES: ReadonlyArray<readonly [string, string]> = [
  ["Aunty Bisi", "Is it 300 or 450 people now??"],
  ["Femi", "Pls add my cousin to the group"],
  ["Mummy C", "My church members are coming o. All of them."],
  ["Kemi (planner)", "Who has the final list? Anybody?"],
  ["Tolu", "I didn't get invite o"],
  ["Uncle Dayo", "Which table am I?"],
  ["Ngozi", "Send the aso ebi account number again"],
  ["Aunty Bisi", "Me and my 4 children will be there"],
  ["Seun", "Is the reception in VI or Lekki?"],
  ["Caterer", "How many plates did we agree?"],
  ["Femi", "RSVP to who exactly?"],
  ["Mummy C", "Add Mrs Okafor. And her sister."],
  ["Kemi (planner)", "Please stop sending names in the group"],
  ["Tunde", "Babe I think we've lost count"],
];

/** Live guest list shown during the count. */
export const GUEST_ROWS: ReadonlyArray<readonly [string, string]> = [
  ["Aunty Bisi + 4", "Table 3"],
  ["Mr & Mrs Okafor", "Table 5"],
  ["Femi Adeyemi", "Table 12"],
  ["Ngozi Eze + 1", "Table 7"],
  ["Uncle Dayo", "Table 1"],
  ["Kemi (planner)", "Head table"],
  ["Tolu Bankole", "Table 9"],
  ["Seun & Ronke", "Table 14"],
];

/** Park–Miller, seeded: the storm lays out the same way on every visit. */
export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * How loud the song is, as a share of its full volume. It is a soft bed under the picture all
 * the way through, and it swells only when the guests are dancing on the stage: the late part of
 * "The dance", then the send-off. (During the chapters from "Getting ready" to "The place kept" the
 * story's own progress holds at the same value, so progress alone cannot tell them apart.)
 */
export function songLevel(mode: ModeName, p: number, pro: number): number {
  const bed = 0.2;
  if (pro < 1) return bed;
  if (mode === "D") return 1;
  // "The dance" begins at 0.97 of the story: the song starts to rise as it does and is full by the send-off.
  if (mode === "old") return bed + (1 - bed) * seg(p, 0.965, 0.99);
  return bed;
}
