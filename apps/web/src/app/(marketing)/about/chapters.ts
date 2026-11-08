/**
 * The About page is one wedding told in seven chapters. The countdown beside it runs from the
 * morning of the proposal to the day itself, so scrolling is how the months pass.
 */
export interface Chapter {
  /** Roman numeral shown in the rail. */
  n: string;
  /** The element id of the chapter's wrapper. */
  id: string;
  title: string;
  /** Days to go when this chapter begins. */
  day: number;
}

export const CHAPTERS: readonly Chapter[] = [
  { n: "I", id: "chapter-yes", title: "The yes", day: 180 },
  { n: "II", id: "chapter-noise", title: "The noise", day: 140 },
  { n: "III", id: "chapter-card", title: "The card", day: 90 },
  { n: "IV", id: "chapter-reply", title: "The reply", day: 45 },
  { n: "V", id: "chapter-seats", title: "The seats", day: 10 },
  { n: "VI", id: "chapter-door", title: "The door", day: 0 },
  { n: "VII", id: "chapter-dance", title: "The dance", day: 0 },
] as const;

/** Days to go at a point in the story: a chapter index plus how far through it the reader is (0 to 1). */
export function daysAt(index: number, within: number): number {
  const a = CHAPTERS[index].day;
  const b = CHAPTERS[Math.min(index + 1, CHAPTERS.length - 1)].day;
  return Math.round(a + (b - a) * Math.min(1, Math.max(0, within)));
}

export function countdownLabel(days: number): string {
  if (days <= 0) return "The day itself";
  return days === 1 ? "1 day to go" : `${days} days to go`;
}
