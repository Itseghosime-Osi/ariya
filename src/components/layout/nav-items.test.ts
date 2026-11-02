import { describe, it, expect } from "vitest";
import { getEventSections, getPhoneMoreSections } from "./nav-items";

const EVENT_ID = "2f1a7c4e-0b6d-4c2a-9f3e-8d5b1a7c4e0b";

describe("getPhoneMoreSections", () => {
  it("leaves out the sections the dock already carries", () => {
    const names = getPhoneMoreSections(EVENT_ID).map((item) => item.name);

    expect(names).not.toContain("Guests");
    expect(names).not.toContain("Check-in");
    expect(names).toContain("Seating");
    expect(names).toContain("Invitations");
  });

  it("leaves Settings to the account sheet", () => {
    const names = getPhoneMoreSections(EVENT_ID).map((item) => item.name);

    expect(names).not.toContain("Settings");
  });

  it("keeps Settings in the desktop sections", () => {
    const names = getEventSections(EVENT_ID).map((item) => item.name);

    expect(names).toContain("Settings");
  });

  it("has nothing to show without a real event", () => {
    expect(getPhoneMoreSections(undefined)).toEqual([]);
    expect(getPhoneMoreSections("default")).toEqual([]);
  });
});
