import { describe, it, expect } from "vitest";
import { createInvitationDesign } from "./design";
import { invitationExportSize } from "./export-service";
const d = () => ({
  ...createInvitationDesign({
    title: "A celebration",
    couple: "Ada & Kunle",
    date: "2026-12-12",
    venue: "Hall",
    area: "Lagos",
    dressCode: null,
    rsvpBy: null,
    theme: "royal_gold",
  }),
  canvas: { ratio: 5 / 7, widthPx: 1080, heightPx: 1512 },
});
describe("export dimensions", () => {
  it("exports document pixels regardless of viewport zoom", () => {
    expect(invitationExportSize(d(), "png")).toMatchObject({
      width: 3240,
      height: 4536,
    });
    expect(invitationExportSize(d(), "jpeg")).toMatchObject({
      width: 2160,
      height: 3024,
    });
  });
  it("produces actual 300 DPI artwork for a five by seven inch PDF", () => {
    expect(invitationExportSize(d(), "pdf")).toMatchObject({
      width: 1500,
      height: 2100,
      widthPt: 360,
      heightPt: 504,
    });
  });
  it("limits large exports to a safe canvas allocation", () => {
    const size = invitationExportSize(
      { ...d(), canvas: { ratio: 5 / 7, widthPx: 5000, heightPx: 5000 } },
      "png"
    );
    expect(size.width * size.height).toBeLessThanOrEqual(24_000_000);
    expect(size.width).toBeLessThanOrEqual(8192);
  });
});
