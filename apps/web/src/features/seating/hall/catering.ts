import type {
  AlcoholAnswer,
  CakeAnswer,
  CateringInput,
  CateringStyle,
} from "@ariya/studio";

/**
 * What the host has decided about the meal, with every answer filled in. This is the app's
 * resolved view of the wire's `CateringPlan`, whose fields are all optional because a stored
 * document may predate the question.
 *
 * `guests` is not in here: it comes from the seating plan, not from the host's answers.
 */
export interface CateringAnswers {
  style: CateringStyle;
  hours: number;
  alcohol: AlcoholAnswer;
  cake: CakeAnswer;
  takeaway: boolean;
  plusOnes: number | null;
  vendors: number | null;
  overage: number | null;
  coldDisplay: boolean;
  hotWeather: boolean;
}

/** What a fresh plan assumes. A Nigerian reception: buffet, beer and wine, takeaway packs. */
export function defaultCatering(): CateringAnswers {
  return {
    style: "buffet",
    hours: 5,
    alcohol: "beer-wine",
    cake: "ceremonial",
    takeaway: true,
    plusOnes: 0.1,
    vendors: null,
    overage: null,
    coldDisplay: false,
    hotWeather: true,
  };
}

/** Fill a stored plan out to a full one, so a document written by an older version still reads. */
export function normaliseCatering(raw: unknown): CateringAnswers {
  const base = defaultCatering();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<CateringAnswers>;
  return {
    style: r.style ?? base.style,
    hours: r.hours ?? base.hours,
    alcohol: r.alcohol ?? base.alcohol,
    cake: r.cake ?? base.cake,
    takeaway: r.takeaway ?? base.takeaway,
    plusOnes: r.plusOnes ?? base.plusOnes,
    vendors: r.vendors ?? base.vendors,
    overage: r.overage ?? base.overage,
    coldDisplay: r.coldDisplay ?? base.coldDisplay,
    hotWeather: r.hotWeather ?? base.hotWeather,
  };
}

/** The engine request for a plan and a head count. */
export function cateringRequest(
  plan: CateringAnswers,
  guests: number
): CateringInput {
  return {
    guests,
    style: plan.style,
    hours: plan.hours,
    alcohol: plan.alcohol,
    cake: plan.cake,
    takeaway: plan.takeaway,
    plusOnes: plan.plusOnes,
    vendors: plan.vendors,
    overage: plan.overage,
    coldDisplay: plan.coldDisplay,
    hotWeather: plan.hotWeather,
  };
}

/**
 * Whether the bar is part of the event at all. The question itself stays on screen either way —
 * it is the control that sets `alcohol`, so hiding it would strand a host who changed their mind
 * with no way back. What hides is the bar's output: the drink lines and staffing behind
 * `alcohol != None` in the engine, and the glassware with them.
 */
export function hasBar(plan: CateringAnswers): boolean {
  return plan.alcohol !== "none";
}

/**
 * The overage the engine would pick for this headcount on its own. Research §E.4 shrinks it as the
 * room grows — a small event cannot judge itself, a 500-guest reception is a production. The slider
 * shows this as its resting point so the host sees the default they are overruling.
 */
export function defaultOverage(guests: number): number {
  if (guests <= 49) return 0.22;
  if (guests <= 150) return 0.15;
  if (guests <= 400) return 0.11;
  return 0.09;
}

/** The overage in force: the host's answer if they have moved the slider, the engine's if not. */
export function overageFor(plan: CateringAnswers, guests: number): number {
  return plan.overage ?? defaultOverage(guests);
}

/** What the slider should say, in the words a host would use rather than "22 %". */
export function overageWords(rate: number): string {
  if (rate === 0) return "Exactly enough — nothing spare";
  if (rate <= 0.08) return "A few late arrivals";
  if (rate <= 0.13) return "The usual cushion";
  if (rate <= 0.18) return "A generous spread";
  return "Feed the neighbours too";
}

/**
 * "0.45 kg per guest" beside "160 kg", so a host with no feel for kilos still knows what they are
 * being asked to buy. Two decimals, not the one the main quantity gets: 0.45 kg a head is what the
 * engine computed, and showing it as "0.5" is an 11 % drift on a figure whose only job is to be
 * checked with a calculator. Shared by the panel and the PDF so the two never disagree.
 */
export function perHead(line: { perGuest: number; unit: string }): string {
  const n =
    line.perGuest >= 1 && Number.isInteger(line.perGuest)
      ? String(line.perGuest)
      : line.perGuest.toFixed(2);
  return `${n} ${line.unit} per guest`;
}
