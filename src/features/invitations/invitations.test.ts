import { describe, it, expect } from "vitest";
import { invitationDesignSchema, trackInvitationsSchema } from "./schemas";

describe("Invitation feature schemas", () => {
  it("validates valid invitation design input", () => {
    const res = invitationDesignSchema.safeParse({
      theme: "emerald_regal",
      headline: "The Royal Union",
      subheadline: "Request your joyful presence",
      attireNote: "Emerald Velvet",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.theme).toBe("emerald_regal");
    }
  });

  it("rejects missing headline", () => {
    const res = invitationDesignSchema.safeParse({
      theme: "royal_gold",
      headline: "",
    });
    expect(res.success).toBe(false);
  });

  it("validates guest IDs for tracking invitations", () => {
    const res = trackInvitationsSchema.safeParse({
      guestIds: [
        "a0000000-0000-0000-0000-000000000001",
        "a0000000-0000-0000-0000-000000000002",
      ],
    });
    expect(res.success).toBe(true);

    const empty = trackInvitationsSchema.safeParse({
      guestIds: [],
    });
    expect(empty.success).toBe(false);
  });
});
