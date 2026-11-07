import { describe, expect, it } from "vitest";
import { cameFromApp } from "./previous-page";

const base = {
  previous: null,
  referrer: "",
  current: "/events/e1/seating",
  origin: "https://app.test",
};

describe("cameFromApp", () => {
  it("is true when the shell recorded a different page", () => {
    expect(cameFromApp({ ...base, previous: "/events/e1/guests" })).toBe(true);
  });

  it("is false for a recorded page that is the current one", () => {
    expect(cameFromApp({ ...base, previous: "/events/e1/seating" })).toBe(
      false
    );
  });

  it("falls back to a same-origin referrer for a tab that loaded straight from the app", () => {
    expect(
      cameFromApp({ ...base, referrer: "https://app.test/events/e1/checklist" })
    ).toBe(true);
  });

  it("is false for a pasted link, an external referrer, or a referrer that is this page", () => {
    expect(cameFromApp(base)).toBe(false);
    expect(
      cameFromApp({ ...base, referrer: "https://www.google.com/search?q=x" })
    ).toBe(false);
    expect(
      cameFromApp({ ...base, referrer: "https://app.test/events/e1/seating" })
    ).toBe(false);
    expect(cameFromApp({ ...base, referrer: "not a url" })).toBe(false);
  });
});
