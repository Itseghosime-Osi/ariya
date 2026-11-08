/**
 * The About page is one wedding told in seven chapters. The countdown beside it runs from the
 * morning of the proposal to the day itself, so scrolling is how the months pass.
 */
import { countdownLabel, type StoryChapter } from "@/components/site/story";

export type Chapter = StoryChapter & { day: number };

export const CHAPTERS: readonly Chapter[] = [
  {
    n: "I",
    id: "chapter-yes",
    title: "The yes",
    day: 180,
    note: countdownLabel(180),
  },
  {
    n: "II",
    id: "chapter-noise",
    title: "The noise",
    day: 140,
    note: countdownLabel(140),
  },
  {
    n: "III",
    id: "chapter-card",
    title: "The card",
    day: 90,
    note: countdownLabel(90),
  },
  {
    n: "IV",
    id: "chapter-reply",
    title: "The reply",
    day: 45,
    note: countdownLabel(45),
  },
  {
    n: "V",
    id: "chapter-seats",
    title: "The seats",
    day: 10,
    note: countdownLabel(10),
  },
  {
    n: "VI",
    id: "chapter-door",
    title: "The door",
    day: 0,
    note: countdownLabel(0),
  },
  {
    n: "VII",
    id: "chapter-dance",
    title: "The dance",
    day: 0,
    note: countdownLabel(0),
  },
] as const;
