/** The choices behind the tap-first create flow: occasions, dates, places, aso-ebi colours and guest sizes. */

export type OccasionKey =
  "wedding" | "engagement" | "naming" | "birthday" | "owambe";

export interface Occasion {
  key: OccasionKey;
  label: string;
  emoji: string;
  /** Two names ("Chidinma & Tunde") or one. */
  names: 1 | 2;
  nameLabels: [string, string];
  namePlaceholders: [string, string];
  kicker: string;
  message: string;
  titles: (names: string) => string[];
}

export const OCCASIONS: Occasion[] = [
  {
    key: "wedding",
    label: "Wedding",
    emoji: "💍",
    names: 2,
    nameLabels: ["First name", "Partner's name"],
    namePlaceholders: ["Chidinma", "Tunde"],
    kicker: "Together with their families",
    message:
      "request the pleasure of your company as they celebrate their union",
    titles: (n) => [`${n}'s Wedding`, `The Nuptials of ${n}`, `${n} Say Yes`],
  },
  {
    key: "engagement",
    label: "Traditional engagement",
    emoji: "🪘",
    names: 2,
    nameLabels: ["First name", "Partner's name"],
    namePlaceholders: ["Chidinma", "Tunde"],
    kicker: "The families invite you to",
    message: "the traditional engagement of",
    titles: (n) => [
      `${n}'s Traditional Engagement`,
      `The Introduction of ${n}`,
      `${n} Introduction Day`,
    ],
  },
  {
    key: "naming",
    label: "Naming ceremony",
    emoji: "👶",
    names: 1,
    nameLabels: ["Baby's name", ""],
    namePlaceholders: ["Oluwaseun", ""],
    kicker: "Join us to welcome",
    message: "as we give thanks and celebrate the naming",
    titles: (n) => [`${n}'s Naming Ceremony`, `Welcome, ${n}`],
  },
  {
    key: "birthday",
    label: "Birthday",
    emoji: "🎂",
    names: 1,
    nameLabels: ["Celebrant's name", ""],
    namePlaceholders: ["Ngozi", ""],
    kicker: "You are invited to celebrate",
    message: "and a day of food, music and good company",
    titles: (n) => [`${n}'s Birthday Owambe`, `${n} Turns the Page`],
  },
  {
    key: "owambe",
    label: "Owambe or other",
    emoji: "🎉",
    names: 1,
    nameLabels: ["Who is it for?", ""],
    namePlaceholders: ["The Adeyemi family", ""],
    kicker: "You are warmly invited to",
    message: "for a day of celebration with family and friends",
    titles: (n) => [`${n}'s Celebration`, `${n} Owambe`],
  },
];

export function occasionOf(key: OccasionKey): Occasion {
  return OCCASIONS.find((o) => o.key === key) ?? OCCASIONS[0];
}

/** Saturday is owambe day. */
export const SATURDAYS_SHOWN = 6;
const SATURDAYS_FROM = 45;

const pad = (n: number) => String(n).padStart(2, "0");

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The next `count` Saturdays that are at least `minDays` away from `from`. */
export function upcomingSaturdays(
  from: Date,
  count = SATURDAYS_SHOWN,
  minDays = SATURDAYS_FROM
): string[] {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + minDays);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return Array.from({ length: count }, (_, i) => {
    const s = new Date(d);
    s.setDate(d.getDate() + i * 7);
    return toYmd(s);
  });
}

/** One of the Saturdays on offer, a couple of months out: a sensible place to start. */
export function suggestedSaturday(from: Date): string {
  return upcomingSaturdays(from)[3];
}

export interface DayParts {
  weekday: string;
  month: string;
  monthShort: string;
  day: string;
  long: string;
}

export function dayParts(ymd: string): DayParts | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(`${ymd}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  return {
    weekday: d.toLocaleDateString("en-GB", { weekday: "short" }),
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    monthShort: d.toLocaleDateString("en-GB", { month: "short" }),
    day: String(d.getDate()),
    long: d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
}

export function daysFromToday(ymd: string, now: Date): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const target = new Date(`${ymd}T00:00:00`);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export interface TimeSlot {
  key: string;
  hm: string;
  label: string;
  clock: string;
}

export const TIME_SLOTS: TimeSlot[] = [
  { key: "morning", hm: "10:00", label: "Morning", clock: "10:00 AM" },
  { key: "afternoon", hm: "14:00", label: "Afternoon", clock: "2:00 PM" },
  { key: "evening", hm: "17:00", label: "Evening", clock: "5:00 PM" },
  { key: "night", hm: "19:00", label: "Night", clock: "7:00 PM" },
];

export const AREAS = [
  "Victoria Island, Lagos",
  "Ikoyi, Lagos",
  "Lekki, Lagos",
  "Ikeja, Lagos",
  "Abuja",
  "Ibadan",
];

export const VENUE_STARTERS = [
  "Event hall",
  "Hotel ballroom",
  "Church & reception",
  "Garden or outdoor",
  "Family compound",
  "Restaurant & lounge",
];

export interface Palette {
  key: string;
  label: string;
  colors: [string, string];
  /** Readable ink for names on the invitation. */
  ink: string;
  dressCode: string;
}

export const PALETTES: Palette[] = [
  {
    key: "burgundy",
    label: "Burgundy & gold",
    colors: ["#6e1426", "#e9c98a"],
    ink: "#6e1426",
    dressCode: "Aṣọ-Ẹbí: Burgundy velvet and champagne gold",
  },
  {
    key: "emerald",
    label: "Emerald & champagne",
    colors: ["#1f6b4a", "#e9c98a"],
    ink: "#1f6b4a",
    dressCode: "Aṣọ-Ẹbí: Emerald green and champagne",
  },
  {
    key: "royal",
    label: "Royal blue & silver",
    colors: ["#2a4a9a", "#cfd6e4"],
    ink: "#243f86",
    dressCode: "Aṣọ-Ẹbí: Royal blue and silver",
  },
  {
    key: "coral",
    label: "Coral & cream",
    colors: ["#d9644a", "#f7e8d0"],
    ink: "#a8452e",
    dressCode: "Aṣọ-Ẹbí: Coral and cream",
  },
  {
    key: "lilac",
    label: "Lilac & gold",
    colors: ["#8a6bb8", "#e9c98a"],
    ink: "#6b4a9a",
    dressCode: "Aṣọ-Ẹbí: Lilac and gold",
  },
  {
    key: "ivory",
    label: "All white & gold",
    colors: ["#f4efe6", "#b8864b"],
    ink: "#6e1426",
    dressCode: "Aṣọ-Ẹbí: All white with gold accents",
  },
];

export const PALETTE_CUSTOM = "custom";

export function paletteOf(key: string): Palette {
  return PALETTES.find((p) => p.key === key) ?? PALETTES[0];
}

export type IntakeMethod = "csv" | "manual" | "skip";

export const INTAKE_OPTIONS: {
  key: IntakeMethod;
  icon: "table_chart_view" | "diversity_3" | "arrow_forward";
  title: string;
  desc: string;
}[] = [
  {
    key: "csv",
    icon: "table_chart_view",
    title: "I have a spreadsheet",
    desc: "Bring your list in from a CSV, straight after we set up.",
  },
  {
    key: "manual",
    icon: "diversity_3",
    title: "I'll add guests one by one",
    desc: "Type in each family or friend as they come to mind.",
  },
  {
    key: "skip",
    icon: "arrow_forward",
    title: "Not yet",
    desc: "Start with a blank list and add guests when you're ready.",
  },
];

export const PARTY_PRESETS = [50, 100, 200, 300, 500];
export const PARTY_MIN = 10;
export const PARTY_MAX = 1000;
export const GUESTS_PER_PARTY = 2;

/** The first Saturday on or after `from`. */
export function saturdayOnOrAfter(from: Date): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return toYmd(d);
}

/** The Saturday closest to `months` months from `from`. */
export function saturdayInMonths(from: Date, months: number): string {
  const d = new Date(
    from.getFullYear(),
    from.getMonth() + months,
    from.getDate()
  );
  return saturdayOnOrAfter(d);
}

export function parseYmd(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(`${ymd}T12:00:00`);
  return isNaN(d.getTime()) ? null : d;
}
