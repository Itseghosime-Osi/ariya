import { describe, expect, it } from "vitest";
import {
  FILM_MAX_SECONDS,
  FINALE_SECONDS,
  GUEST_INTRO_SECONDS,
  MAX_SCENES,
  SCENES_MAX_SECONDS,
  buildTimeline,
  canAddScene,
  defaultFilmDesign,
  filmDesignSchema,
  filmSeconds,
  guestFirstName,
  makeScene,
  readFilmDesign,
  scenesSeconds,
  secondsLeft,
  stepAt,
} from "./design";

describe("the film's length", () => {
  it("never passes 45 seconds, even with every allowance used", () => {
    expect(SCENES_MAX_SECONDS + FINALE_SECONDS + GUEST_INTRO_SECONDS).toBe(
      FILM_MAX_SECONDS
    );
  });

  it("starts with a default that leaves room to add more", () => {
    const film = defaultFilmDesign();
    expect(filmDesignSchema.safeParse(film).success).toBe(true);
    expect(filmSeconds(film)).toBeLessThanOrEqual(FILM_MAX_SECONDS);
    expect(secondsLeft(film)).toBeGreaterThan(0);
  });

  it("adds the guest's name and the card to the host's scenes", () => {
    const film = defaultFilmDesign();
    const scenes = scenesSeconds(film.scenes);
    expect(filmSeconds(film)).toBe(scenes + FINALE_SECONDS);
    expect(filmSeconds(film, { personal: true })).toBe(
      scenes + FINALE_SECONDS + GUEST_INTRO_SECONDS
    );
  });

  it("refuses a design whose scenes would make the film too long", () => {
    const film = defaultFilmDesign();
    film.scenes = Array.from({ length: 5 }, (_, i) => ({
      id: `x${i}`,
      kind: "message" as const,
      seconds: 10,
    }));
    expect(filmDesignSchema.safeParse(film).success).toBe(false);
  });

  it("stops offering scenes when the time or the count runs out", () => {
    const film = defaultFilmDesign();
    while (canAddScene(film)) {
      const scene = makeScene("message", film);
      if (!scene) break;
      film.scenes.push(scene);
    }
    expect(
      scenesSeconds(film.scenes) > SCENES_MAX_SECONDS - 3 ||
        film.scenes.length === MAX_SCENES
    ).toBe(true);
    expect(scenesSeconds(film.scenes)).toBeLessThanOrEqual(SCENES_MAX_SECONDS);
    expect(makeScene("welcome", film)).toBeNull();
  });

  it("shortens a new scene to the time that is left", () => {
    const film = defaultFilmDesign();
    film.scenes = [{ id: "a", kind: "message", seconds: 10 }];
    film.scenes.push({ id: "b", kind: "message", seconds: 10 });
    film.scenes.push({ id: "c", kind: "message", seconds: 10 });
    const next = makeScene("celebrant", film);
    expect(next?.seconds).toBe(6);
  });
});

describe("the timeline", () => {
  it("runs the scenes in order and ends on the invitation card", () => {
    const film = defaultFilmDesign();
    const { steps, total } = buildTimeline(film);
    expect(steps.map((s) => s.kind)).toEqual([
      ...film.scenes.map((s) => s.kind),
      "finale",
    ]);
    expect(total).toBe(filmSeconds(film));
    expect(steps.at(-1)?.end).toBe(total);
  });

  it("opens with the guest's name on a personal link", () => {
    const film = defaultFilmDesign();
    const { steps, total } = buildTimeline(film, { personal: true });
    expect(steps[0].kind).toBe("intro");
    expect(total).toBe(filmSeconds(film, { personal: true }));
  });

  it("finds the step on screen at any moment", () => {
    const { steps, total } = buildTimeline(defaultFilmDesign());
    expect(stepAt(steps, 0).index).toBe(0);
    expect(stepAt(steps, steps[1].start + 0.1).index).toBe(1);
    const end = stepAt(steps, total + 5);
    expect(end.step.kind).toBe("finale");
    expect(end.progress).toBe(1);
  });
});

describe("reading a stored design", () => {
  it("falls back to the default rather than failing", () => {
    expect(readFilmDesign(null).scenes.length).toBeGreaterThan(0);
    expect(readFilmDesign({ nonsense: true }).enabled).toBe(false);
  });

  it("keeps a valid design as it is", () => {
    const film = defaultFilmDesign();
    film.enabled = true;
    expect(readFilmDesign(film)).toEqual(film);
  });

  it("only takes songs and photos from an https address", () => {
    const film = defaultFilmDesign();
    film.song = { url: "javascript:alert(1)", title: "x" };
    expect(filmDesignSchema.safeParse(film).success).toBe(false);
  });
});

describe("a guest's first name", () => {
  it("takes the first word", () => {
    expect(guestFirstName("Chief Olawale Adeyemi")).toBe("Chief");
    expect(guestFirstName("  Folake ")).toBe("Folake");
    expect(guestFirstName(null)).toBe("");
  });
});

import { inviteAccess } from "./visibility";
import { looksLikeMp3 } from "./actions";

describe("who may open an invitation", () => {
  it("opens for everyone once it is live", () => {
    expect(inviteAccess({ live: true, isTeamMember: false })).toBe("open");
  });
  it("keeps test mode to the celebration's own team", () => {
    expect(inviteAccess({ live: false, isTeamMember: true })).toBe(
      "test-preview"
    );
    expect(inviteAccess({ live: false, isTeamMember: false })).toBe("not-live");
  });
});

describe("recognising an MP3", () => {
  it("accepts an ID3 tag and an audio frame", () => {
    expect(looksLikeMp3(new Uint8Array([0x49, 0x44, 0x33, 0x04]))).toBe(true);
    expect(looksLikeMp3(new Uint8Array([0xff, 0xfb, 0x90, 0x00]))).toBe(true);
  });
  it("refuses anything else", () => {
    expect(looksLikeMp3(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toBe(false);
    expect(looksLikeMp3(new Uint8Array([1, 2]))).toBe(false);
  });
});
