import { describe, it, expect } from "vitest";
import {
  ACCOUNT_SECTIONS,
  getEventSections,
  getPhoneMoreSections,
} from "./nav-items";

const EVENT_ID = "2f1a7c4e-0b6d-4c2a-9f3e-8d5b1a7c4e0b";

describe("getPhoneMoreSections", () => {
  it("leaves out the sections the dock already carries", () => {
    const names = getPhoneMoreSections(EVENT_ID).map((item) => item.name);

    expect(names).not.toContain("Guests");
    expect(names).not.toContain("Check-in");
    expect(names).toContain("Seating");
    expect(names).toContain("Invitations");
  });

  it("keeps Event settings in More, and account Settings out of it", () => {
    const names = getPhoneMoreSections(EVENT_ID).map((item) => item.name);

    expect(names).toContain("Event settings");
    expect(names).not.toContain("Settings");
  });

  it("files Event settings under Planning", () => {
    const item = getEventSections(EVENT_ID).find(
      (i) => i.name === "Event settings"
    );

    expect(item?.group).toBe("plan");
    expect(item?.href).toBe(`/events/${EVENT_ID}/settings`);
  });

  it("gives the account its own Profile and Settings", () => {
    expect(ACCOUNT_SECTIONS.map((i) => [i.name, i.href])).toEqual([
      ["Profile", "/profile"],
      ["Settings", "/settings"],
    ]);
  });

  it("has nothing to show without a real event", () => {
    expect(getPhoneMoreSections(undefined)).toEqual([]);
    expect(getPhoneMoreSections("default")).toEqual([]);
  });
});
