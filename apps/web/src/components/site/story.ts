/** What a story page knows about its chapters. Plain data and pure functions, so servers and clients can both use it. */
export interface StoryChapter {
  /** Roman numeral shown in the rail. */
  n: string;
  /** The element id of the chapter's wrapper. */
  id: string;
  title: string;
  /** Shown on the chapter card, e.g. "90 days to go" or "Guests". */
  note?: string;
  /** Days to go when this chapter begins (countdown mode only). */
  day?: number;
}

export interface Meter {
  /** The big figure beside the rail. */
  big: string;
  /** What it counts. */
  small: string;
  /** The same thing in a few words for the phone pill. */
  pill: string;
}

export function countdownLabel(days: number): string {
  if (days <= 0) return "The day itself";
  return days === 1 ? "1 day to go" : `${days} days to go`;
}

/** Days to go at a point in the story: a chapter index plus how far through it the reader is (0 to 1). */
export function daysAt(
  chapters: readonly StoryChapter[],
  index: number,
  within: number
): number {
  const a = chapters[index].day ?? 0;
  const b = chapters[Math.min(index + 1, chapters.length - 1)].day ?? 0;
  return Math.round(a + (b - a) * Math.min(1, Math.max(0, within)));
}

export function measure(
  mode: "days" | "steps",
  chapters: readonly StoryChapter[],
  index: number,
  within: number
): Meter {
  if (mode === "days") {
    const days = daysAt(chapters, index, within);
    return {
      big: String(days),
      small: days <= 0 ? "Today" : "days to go",
      pill: countdownLabel(days),
    };
  }
  return {
    big: String(index + 1),
    small: `of ${chapters.length}`,
    pill: `${index + 1} of ${chapters.length}`,
  };
}
