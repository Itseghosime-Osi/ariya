import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInvitationDesign } from "./design";
const { client, result, select } = vi.hoisted(() => ({
  client: vi.fn(),
  result: vi.fn(),
  select: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: client }));
import { getInvitationDesignerData } from "./queries";
const stored = createInvitationDesign({
  couple: "Saved names",
  theme: "emerald_regal",
});
const row = {
  id: "event",
  title: "Celebration",
  couple: "Original names",
  date: "2026-12-12",
  venue: "Hall",
  area: "Lagos",
  dress_code: "Burgundy",
  rsvp_by: "2026-12-01",
  paid_at: null,
  invitation_theme: "royal_gold",
  invitation_headline: "Join us",
  invitation_subheadline: null,
  invitation_message: "Original words",
  invitation_design: stored,
  updated_at: "2026-11-10T12:00:00Z",
};
beforeEach(() => {
  const query = { select, eq: () => query, maybeSingle: result };
  select.mockReturnValue(query);
  client.mockResolvedValue({ from: () => query });
  result.mockResolvedValue({ data: row, error: null });
});
describe("designer data mapping", () => {
  it("loads the saved document instead of rebuilding the house template on refresh", async () => {
    const data = await getInvitationDesignerData("event");
    expect(data?.design).toEqual(stored);
    expect(data?.revision).toBe(row.updated_at);
  });
  it("maps legacy database column names when no document has been saved", async () => {
    result.mockResolvedValue({
      data: { ...row, invitation_design: null },
      error: null,
    });
    const data = await getInvitationDesignerData("event");
    expect(
      data?.design.layers.find((l) => l.id === "dressCode")?.text
    ).toContain("Burgundy");
    expect(data?.design.layers.find((l) => l.id === "names")?.text).toBe(
      "Join us"
    );
  });
});
