import { describe, it, expect } from "vitest";
import { createInvitationDesign } from "./design";
import { invitationDesignSchema, trackInvitationsSchema } from "./schemas";

const houseDesign = createInvitationDesign({
  couple: "Ọlá & Adéṣọlá",
  date: "2026-12-12T13:00:00Z",
  venue: "Eko Hotel, Victoria Island",
  theme: "emerald_regal",
});

describe("Invitation feature schemas", () => {
  it("accepts the design the studio saves", () => {
    const res = invitationDesignSchema.safeParse(houseDesign);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.theme).toBe("emerald_regal");
      expect(res.data.layers.map((layer) => layer.kind)).toContain("names");
    }
  });

  it("rejects a layer dragged outside the card", () => {
    const res = invitationDesignSchema.safeParse({
      ...houseDesign,
      layers: houseDesign.layers.map((layer) => ({ ...layer, x: 140 })),
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
