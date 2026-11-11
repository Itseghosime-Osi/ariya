import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildFloorPlanPdf, winAnsi } from "./floorplan-pdf";
import { defaultLayout } from "./model";
import { sharePath, shareOf } from "./share";

describe("buildFloorPlanPdf", () => {
  it("makes a one-page A4 landscape PDF from a hall and its tables", async () => {
    const bytes = await buildFloorPlanPdf({
      title: "Àríyá of Ẹniọla & Tọ́lá",
      subtitle: "Victoria Island · 12 Dec",
      layout: defaultLayout(30, 20),
      tables: [
        {
          name: "Table 01",
          shape: "round",
          capacity: 10,
          x: 5,
          y: 8,
          rot: 0,
          seated: 6,
        },
        {
          name: "Head table",
          shape: "head",
          capacity: 8,
          x: 15,
          y: 3,
          rot: 90,
        },
      ],
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect([width, height]).toEqual([842, 595]);
  });
});

describe("winAnsi", () => {
  it("keeps Latin-1 letters and reduces the rest to their base letter", () => {
    expect(winAnsi("Àríyá")).toBe("Àríyá");
    expect(winAnsi("Ẹniọla")).toBe("Eniola");
    expect(winAnsi("30 × 20 m — fine")).toBe("30 x 20 m - fine");
  });
});

describe("shareOf", () => {
  it("reads a well-formed link and ignores anything else", () => {
    const token = "a".repeat(32);
    expect(shareOf({ share: { token, createdAt: 1 } })).toEqual({
      token,
      createdAt: 1,
    });
    expect(shareOf({ share: { token: "short", createdAt: 1 } })).toBeNull();
    expect(
      shareOf({ share: { token: `${token}<script>`, createdAt: 1 } })
    ).toBeNull();
    expect(shareOf(null)).toBeNull();
    expect(sharePath(token)).toBe(`/plan/${token}`);
  });
});
