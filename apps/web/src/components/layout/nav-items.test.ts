import { describe, it, expect } from "vitest";
import {
  ACCOUNT_SECTIONS,
  getEventSections,
  getPhoneMoreSections,
  hasOwnPhoneHeader,
  isWorkspaceRoute,
} from "./nav-items";

const EVENT_ID = "2f1a7c4e-0b6d-4c2a-9f3e-8d5b1a7c4e0b";

describe("getPhoneMoreSections", () => {
  it("leaves out the sections the dock already carries", () => {
    const names = getPhoneMoreSections(EVENT_ID).map((item) => item.name);

    expect(names).not.toContain("Guests");
    expect(names).not.toContain("Check-in");
    expect(names).toContain("Run sheet");
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

describe("hasOwnPhoneHeader", () => {
  it("is true for the account pages and an event's Billing, Team, Vendors and Settings", () => {
    expect(hasOwnPhoneHeader("/settings")).toBe(true);
    expect(hasOwnPhoneHeader("/profile")).toBe(true);
    expect(hasOwnPhoneHeader("/profile/archive")).toBe(true);
    expect(hasOwnPhoneHeader("/events/new")).toBe(true);
    expect(hasOwnPhoneHeader("/approvals")).toBe(true);
    expect(hasOwnPhoneHeader("/connect-ai")).toBe(true);
    expect(hasOwnPhoneHeader("/connect-ai/guide")).toBe(true);
    expect(hasOwnPhoneHeader(`/events/${EVENT_ID}/billing`)).toBe(true);
    expect(hasOwnPhoneHeader(`/events/${EVENT_ID}/team`)).toBe(true);
    expect(hasOwnPhoneHeader(`/events/${EVENT_ID}/vendors`)).toBe(true);
    expect(hasOwnPhoneHeader(`/events/${EVENT_ID}/settings`)).toBe(true);
    expect(hasOwnPhoneHeader(`/events/${EVENT_ID}/guests`)).toBe(true);
    expect(hasOwnPhoneHeader(`/events/${EVENT_ID}/reminders`)).toBe(true);
    expect(hasOwnPhoneHeader(`/events/${EVENT_ID}/checklist`)).toBe(true);
    expect(hasOwnPhoneHeader(`/events/${EVENT_ID}/day-of`)).toBe(true);
    expect(hasOwnPhoneHeader(`/events/${EVENT_ID}/page-editor`)).toBe(true);
  });

  it("is false everywhere else, including billing's callback", () => {
    expect(hasOwnPhoneHeader("/events")).toBe(false);
    expect(hasOwnPhoneHeader(`/events/${EVENT_ID}`)).toBe(false);
    expect(hasOwnPhoneHeader(`/events/${EVENT_ID}/seating`)).toBe(false);
    expect(hasOwnPhoneHeader(`/events/${EVENT_ID}/billing/callback`)).toBe(
      false
    );
  });
});

describe("isWorkspaceRoute", () => {
  it("is the seating studio and the invitation designer, nothing else", () => {
    expect(isWorkspaceRoute("/events/abc/seating")).toBe(true);
    expect(isWorkspaceRoute("/events/abc/invitations/design")).toBe(true);
    expect(isWorkspaceRoute("/events/abc/invitations")).toBe(false);
    expect(isWorkspaceRoute("/events/abc/seating/print")).toBe(false);
    expect(isWorkspaceRoute("/events/abc/guests")).toBe(false);
    expect(isWorkspaceRoute("/events/abc")).toBe(false);
    expect(isWorkspaceRoute("/settings")).toBe(false);
  });
});
