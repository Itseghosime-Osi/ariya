import type { StoryChapter } from "@/components/site/story";

/** What we do, in the order a host meets it: seven chapters from the list to the helper. */
export const PRODUCT_CHAPTERS: readonly StoryChapter[] = [
  { n: "I", id: "chapter-list", title: "The list", note: "Guests" },
  { n: "II", id: "chapter-card", title: "The card", note: "Invitations" },
  { n: "III", id: "chapter-send", title: "The send", note: "Links and email" },
  { n: "IV", id: "chapter-replies", title: "The replies", note: "RSVPs" },
  { n: "V", id: "chapter-seats", title: "The seats", note: "Seating" },
  {
    n: "VI",
    id: "chapter-day",
    title: "The day",
    note: "Vendors and the door",
  },
  { n: "VII", id: "chapter-helper", title: "The helper", note: "Your own AI" },
] as const;
