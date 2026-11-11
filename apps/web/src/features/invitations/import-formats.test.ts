import { describe, expect, it } from "vitest";
import { importKind, IMPORT_ACCEPT } from "./import-formats";

const f = (name: string, type = "") => ({ name, type });

describe("importKind", () => {
  it("keeps PNG, JPG and WebP as they are", () => {
    expect(importKind(f("a.png", "image/png"))).toBe("raster");
    expect(importKind(f("a.jpg", "image/jpeg"))).toBe("raster");
    expect(importKind(f("a.webp", "image/webp"))).toBe("raster");
  });
  it("recognises SVG by type or extension", () => {
    expect(importKind(f("a.svg", "image/svg+xml"))).toBe("svg");
    expect(importKind(f("LOGO.SVG"))).toBe("svg");
  });
  it("sends PDF and Illustrator files through the PDF reader", () => {
    expect(importKind(f("card.pdf", "application/pdf"))).toBe("pdf");
    expect(importKind(f("card.ai", "application/postscript"))).toBe("pdf");
    expect(importKind(f("CARD.AI"))).toBe("pdf");
  });
  it("recognises Photoshop files", () => {
    expect(importKind(f("card.psd"))).toBe("psd");
    expect(importKind(f("x", "image/vnd.adobe.photoshop"))).toBe("psd");
  });
  it("rejects everything else", () => {
    expect(importKind(f("a.gif", "image/gif"))).toBe("unsupported");
    expect(importKind(f("notes.docx"))).toBe("unsupported");
    expect(importKind(f("script.svg.exe"))).toBe("unsupported");
  });
  it("offers every supported extension in the file picker", () => {
    for (const ext of [".svg", ".pdf", ".ai", ".psd"])
      expect(IMPORT_ACCEPT).toContain(ext);
  });
});
