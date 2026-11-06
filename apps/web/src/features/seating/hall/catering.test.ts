import { describe, expect, it } from "vitest";
import {
  cateringRequest,
  defaultCatering,
  defaultOverage,
  hasBar,
  normaliseCatering,
  overageFor,
  overageWords,
  perHead,
} from "./catering";

describe("catering plan", () => {
  it("starts on a Nigerian buffet with a bar, because that is the common case", () => {
    const plan = defaultCatering();
    expect(plan.style).toBe("buffet");
    expect(plan.alcohol).toBe("beer-wine");
    expect(plan.takeaway).toBe(true);
  });

  it("fills a half-written plan out rather than dropping it", () => {
    const plan = normaliseCatering({ alcohol: "none" });
    expect(plan.alcohol).toBe("none");
    expect(plan.style).toBe("buffet");
    expect(plan.hours).toBe(5);
  });

  it("treats junk as a fresh plan", () => {
    expect(normaliseCatering(null)).toEqual(defaultCatering());
    expect(normaliseCatering("nonsense")).toEqual(defaultCatering());
  });

  it("keeps a stored zero rather than replacing it with the default", () => {
    const plan = normaliseCatering({ plusOnes: 0, vendors: 0, overage: 0 });
    expect(plan.plusOnes).toBe(0);
    expect(plan.vendors).toBe(0);
    expect(plan.overage).toBe(0);
  });

  it("sends the head count from the seating plan, not from the answers", () => {
    const request = cateringRequest(defaultCatering(), 240);
    expect(request.guests).toBe(240);
    expect(request.style).toBe("buffet");
    expect(request.alcohol).toBe("beer-wine");
  });

  it("knows when there is no bar to buy for", () => {
    expect(hasBar(defaultCatering())).toBe(true);
    expect(hasBar({ ...defaultCatering(), alcohol: "none" })).toBe(false);
    expect(hasBar({ ...defaultCatering(), alcohol: "unsure" })).toBe(true);
  });

  it("passes an unanswered plus-one rate through as null, so the engine picks by size", () => {
    const request = cateringRequest(
      { ...defaultCatering(), plusOnes: null },
      300
    );
    expect(request.plusOnes).toBeNull();
  });
});

describe("the overage slider", () => {
  it("rests on the engine's own figure, so the host sees what they are overruling", () => {
    expect(defaultOverage(40)).toBe(0.22);
    expect(defaultOverage(120)).toBe(0.15);
    expect(defaultOverage(300)).toBe(0.11);
    expect(defaultOverage(500)).toBe(0.09);
  });

  it("uses the host's answer when there is one, and the head count's when there is not", () => {
    const plan = defaultCatering();
    expect(overageFor(plan, 300)).toBe(0.11);
    expect(overageFor({ ...plan, overage: 0.3 }, 300)).toBe(0.3);
  });

  it("keeps an explicit zero rather than falling back to the default", () => {
    expect(overageFor({ ...defaultCatering(), overage: 0 }, 300)).toBe(0);
  });

  it("says what the number means, because '11 %' tells a host nothing", () => {
    expect(overageWords(0)).toMatch(/nothing spare/i);
    expect(overageWords(0.11)).toMatch(/usual cushion/i);
    expect(overageWords(0.4)).toMatch(/neighbours/i);
  });

  it("sends the host's overage to the engine", () => {
    const request = cateringRequest(
      { ...defaultCatering(), overage: 0.3 },
      300
    );
    expect(request.overage).toBe(0.3);
  });
});

describe("the per-head figure on the sheet", () => {
  it("keeps the unit, because '0.5 per guest' names nothing anyone can buy", () => {
    expect(perHead({ perGuest: 0.45, unit: "kg" })).toBe("0.45 kg per guest");
  });

  it("keeps two decimals, so 0.45 kg does not drift to 0.5", () => {
    expect(perHead({ perGuest: 0.19, unit: "kg" })).toBe("0.19 kg per guest");
  });

  it("does not show a decimal on something counted", () => {
    expect(perHead({ perGuest: 13, unit: "pieces" })).toBe(
      "13 pieces per guest"
    );
  });
});
