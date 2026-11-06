/**
 * The event film: a short, auto-playing 3D introduction a host designs once and every guest watches.
 * It is never longer than 45 seconds in all, so nobody gets bored: the host's scenes share 36 seconds,
 * a guest's personal link adds three seconds that say their name, and the invitation card is always
 * the last six.
 *
 * Everything here is pure: the editor, the player, the server action that saves a design and the tests
 * all read the same numbers.
 */
import { z } from "zod";

export const FILM_MAX_SECONDS = 45;
/** The invitation card, always last. */
export const FINALE_SECONDS = 6;
/** "For {name}", shown on a guest's personal link only. */
export const GUEST_INTRO_SECONDS = 3;
/** What the host's own scenes may add up to. */
export const SCENES_MAX_SECONDS =
  FILM_MAX_SECONDS - FINALE_SECONDS - GUEST_INTRO_SECONDS;
export const SCENE_MIN_SECONDS = 3;
export const SCENE_MAX_SECONDS = 10;
export const MAX_SCENES = 7;
export const MAX_PHOTOS = 2;
export const SCENE_TEXT_MAX = 160;
/** The song upload, in bytes (about 10 MB). */
export const SONG_MAX_BYTES = 10 * 1024 * 1024;

export const SCENE_KINDS = [
  "welcome",
  "celebrant",
  "when",
  "where",
  "message",
  "dress",
  "countdown",
] as const;
export type SceneKind = (typeof SCENE_KINDS)[number];

export interface SceneInfo {
  kind: SceneKind;
  label: string;
  blurb: string;
  /** A sensible length when it is added. */
  seconds: number;
  /** The scene shows a line of the host's own words. */
  hasText: boolean;
  textPlaceholder?: string;
}

export const SCENE_CATALOG: readonly SceneInfo[] = [
  {
    kind: "welcome",
    label: "Welcome",
    blurb: "The celebration's names, rising out of the dark.",
    seconds: 5,
    hasText: true,
    textPlaceholder: "Together with their families…",
  },
  {
    kind: "celebrant",
    label: "The celebrants",
    blurb: "Their photos, floating in turn, with a line about them.",
    seconds: 7,
    hasText: true,
    textPlaceholder: "Two people, one very long story.",
  },
  {
    kind: "when",
    label: "The day",
    blurb: "The date, on a turning calendar page.",
    seconds: 4,
    hasText: false,
  },
  {
    kind: "where",
    label: "The place",
    blurb: "The venue and the city.",
    seconds: 4,
    hasText: false,
  },
  {
    kind: "message",
    label: "A message",
    blurb: "A few words from the host to every guest.",
    seconds: 6,
    hasText: true,
    textPlaceholder: "We cannot wait to dance with you.",
  },
  {
    kind: "dress",
    label: "Aṣọ-ẹbí",
    blurb: "The colours everyone will wear.",
    seconds: 4,
    hasText: false,
  },
  {
    kind: "countdown",
    label: "Countdown",
    blurb: "How many days to go.",
    seconds: 4,
    hasText: false,
  },
] as const;

export const sceneInfo = (kind: SceneKind): SceneInfo =>
  SCENE_CATALOG.find((s) => s.kind === kind) ?? SCENE_CATALOG[0];

export interface FilmPalette {
  key: string;
  label: string;
  background: string;
  accent: string;
}

/** Starting colours, matching the setup wizard's aṣọ-ẹbí choices; the host can still set their own. */
export const FILM_PALETTES: readonly FilmPalette[] = [
  {
    key: "burgundy",
    label: "Burgundy & gold",
    background: "#2a0610",
    accent: "#e9c98a",
  },
  {
    key: "emerald",
    label: "Emerald & champagne",
    background: "#0d2e22",
    accent: "#e9c98a",
  },
  {
    key: "royal",
    label: "Royal blue & silver",
    background: "#0f1f4d",
    accent: "#cfd6e4",
  },
  {
    key: "coral",
    label: "Coral & cream",
    background: "#4a1d14",
    accent: "#f7e8d0",
  },
  {
    key: "lilac",
    label: "Lilac & gold",
    background: "#2a1745",
    accent: "#e9c98a",
  },
  {
    key: "ivory",
    label: "All white & gold",
    background: "#1c1710",
    accent: "#d4a85a",
  },
] as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #2a0610");

const assetUrl = z
  .string()
  .url()
  .max(600)
  .refine((u) => u.startsWith("https://") || u.startsWith("http://127.0.0.1"), {
    message: "Files must be uploaded here",
  });

export const filmSceneSchema = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(SCENE_KINDS),
  seconds: z.number().int().min(SCENE_MIN_SECONDS).max(SCENE_MAX_SECONDS),
  text: z.string().trim().max(SCENE_TEXT_MAX).optional(),
});

export const filmDesignSchema = z
  .object({
    enabled: z.boolean(),
    scenes: z.array(filmSceneSchema).min(1).max(MAX_SCENES),
    song: z
      .object({
        url: assetUrl.nullable(),
        title: z.string().trim().max(80).nullable(),
      })
      .default({ url: null, title: null }),
    colors: z.object({ background: hex, accent: hex }),
    photos: z
      .array(
        z.object({
          url: assetUrl,
          caption: z.string().trim().max(40).default(""),
        })
      )
      .max(MAX_PHOTOS)
      .default([]),
  })
  .superRefine((film, ctx) => {
    if (scenesSeconds(film.scenes) > SCENES_MAX_SECONDS) {
      ctx.addIssue({
        code: "custom",
        path: ["scenes"],
        message: `Scenes can run ${SCENES_MAX_SECONDS} seconds in all, so the whole film stays under ${FILM_MAX_SECONDS}.`,
      });
    }
  });

export type FilmScene = z.infer<typeof filmSceneSchema>;
export type FilmDesign = z.infer<typeof filmDesignSchema>;

export function scenesSeconds(scenes: readonly Pick<FilmScene, "seconds">[]) {
  return scenes.reduce((sum, s) => sum + s.seconds, 0);
}

/** The whole film's length: the host's scenes, the guest's name if it is a personal link, the card. */
export function filmSeconds(
  film: Pick<FilmDesign, "scenes">,
  options: { personal?: boolean } = {}
) {
  return (
    scenesSeconds(film.scenes) +
    FINALE_SECONDS +
    (options.personal ? GUEST_INTRO_SECONDS : 0)
  );
}

/** Seconds the host has left to give to scenes. */
export function secondsLeft(film: Pick<FilmDesign, "scenes">) {
  return Math.max(0, SCENES_MAX_SECONDS - scenesSeconds(film.scenes));
}

export function canAddScene(
  film: Pick<FilmDesign, "scenes">,
  seconds = SCENE_MIN_SECONDS
) {
  return (
    film.scenes.length < MAX_SCENES &&
    scenesSeconds(film.scenes) + seconds <= SCENES_MAX_SECONDS
  );
}

let counter = 0;
export function newSceneId(): string {
  counter += 1;
  return `s${Date.now().toString(36)}${counter.toString(36)}`;
}

/** A new scene at its natural length, shortened to whatever time is left. */
export function makeScene(
  kind: SceneKind,
  film: Pick<FilmDesign, "scenes">
): FilmScene | null {
  const left = secondsLeft(film);
  if (film.scenes.length >= MAX_SCENES || left < SCENE_MIN_SECONDS) return null;
  return {
    id: newSceneId(),
    kind,
    seconds: Math.min(sceneInfo(kind).seconds, left),
  };
}

/** What a celebration starts with before the host touches anything: five scenes, 24 seconds. */
export function defaultFilmDesign(): FilmDesign {
  const base: FilmDesign = {
    enabled: false,
    scenes: [],
    song: { url: null, title: null },
    colors: {
      background: FILM_PALETTES[0].background,
      accent: FILM_PALETTES[0].accent,
    },
    photos: [],
  };
  const kinds: SceneKind[] = [
    "welcome",
    "celebrant",
    "when",
    "where",
    "message",
  ];
  for (const kind of kinds) {
    const scene = makeScene(kind, base);
    if (scene) base.scenes.push(scene);
  }
  return base;
}

/** Reads a stored design; anything missing or malformed falls back to the default, never throws. */
export function readFilmDesign(raw: unknown): FilmDesign {
  const parsed = filmDesignSchema.safeParse(raw);
  return parsed.success ? parsed.data : defaultFilmDesign();
}

export interface TimelineStep {
  /** "intro" is the guest's name; "finale" is the invitation card. */
  kind: SceneKind | "intro" | "finale";
  id: string;
  start: number;
  end: number;
  text?: string;
}

/** The film as one timeline of seconds. The player walks it; nothing else decides what is on screen. */
export function buildTimeline(
  film: Pick<FilmDesign, "scenes">,
  options: { personal?: boolean } = {}
): { steps: TimelineStep[]; total: number } {
  const steps: TimelineStep[] = [];
  let t = 0;
  const push = (
    kind: TimelineStep["kind"],
    id: string,
    seconds: number,
    text?: string
  ) => {
    steps.push({ kind, id, start: t, end: t + seconds, text });
    t += seconds;
  };
  if (options.personal) push("intro", "intro", GUEST_INTRO_SECONDS);
  for (const scene of film.scenes) {
    push(scene.kind, scene.id, scene.seconds, scene.text || undefined);
  }
  push("finale", "finale", FINALE_SECONDS);
  return { steps, total: t };
}

/** Which step is on screen at a moment, and how far through it we are (0 to 1). */
export function stepAt(
  steps: readonly TimelineStep[],
  at: number
): { index: number; step: TimelineStep; progress: number } {
  const clamped = Math.max(0, at);
  let index = steps.findIndex((s) => clamped < s.end);
  if (index === -1) index = steps.length - 1;
  const step = steps[index];
  const progress = Math.min(
    1,
    Math.max(0, (clamped - step.start) / (step.end - step.start))
  );
  return { index, step, progress };
}

/** "Chief Olawale Adeyemi" -> "Chief"; a name with no space stays whole. */
export function guestFirstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

/** MP3 starts with an ID3 tag or an MPEG audio frame sync; anything else is not a song. */
export function looksLikeMp3(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const frame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  return id3 || frame;
}
