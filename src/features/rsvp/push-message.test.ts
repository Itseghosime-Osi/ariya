import { describe, expect, it } from "vitest";
import { rsvpPushMessage } from "./push-message";
import type { InvitationData } from "./types";

const invitation = {
  guest: { id: "g1", display_name: "Ada Okafor" },
  event: { id: "e1", title: "The Wedding", couple: "Ada & Kunle" },
} as unknown as InvitationData;

describe("RSVP notification", () => {
  it("celebrates a yes", () => {
    expect(rsvpPushMessage(invitation, "accepted", 2, false)).toEqual({
      title: "Ada Okafor is coming 🎉",
      body: "2 seats for Ada & Kunle",
      url: "/events/e1/guests",
      tag: "rsvp-g1",
    });
  });
  it("says one seat, not one seats", () => {
    expect(rsvpPushMessage(invitation, "accepted", 1, false).body).toBe(
      "1 seat for Ada & Kunle"
    );
  });
  it("reports a no and a change of mind", () => {
    expect(rsvpPushMessage(invitation, "declined", 0, false).title).toBe(
      "Ada Okafor can't make it"
    );
    expect(rsvpPushMessage(invitation, "declined", 0, true).title).toBe(
      "Ada Okafor updated their RSVP"
    );
  });
});
