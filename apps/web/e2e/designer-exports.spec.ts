import { test, expect, type Page } from "@playwright/test";
import {
  createAndLoginUser,
  createTestEvent,
  showAllInspectorOptions,
} from "./fixtures/test-helpers";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { inflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import path from "node:path";

type Pixel = [number, number, number];
const distance = (a: Pixel, b: Pixel) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Samples an exported PNG or JPEG at fractions of the card, decoded in the browser. */
async function sample(
  page: Page,
  file: Buffer,
  mime: string,
  at: [number, number][]
) {
  return page.evaluate(
    async ({ url, at }) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      return at.map(
        ([x, y]) =>
          Array.from(
            ctx.getImageData(
              Math.min(canvas.width - 1, Math.round(x * canvas.width)),
              Math.min(canvas.height - 1, Math.round(y * canvas.height)),
              1,
              1
            ).data
          ).slice(0, 3) as Pixel
      );
    },
    { url: `data:${mime};base64,${file.toString("base64")}`, at }
  );
}

/** The flattened picture inside the PDF, read back without a PDF renderer. */
async function pdfPixels(pdf: Buffer, at: [number, number][]) {
  const doc = await PDFDocument.load(pdf);
  expect(doc.getPageCount()).toBe(1);
  let found: { width: number; height: number; rgb: Buffer } | null = null;
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    const dict = object.dict;
    if (dict.get(PDFName.of("Subtype"))?.toString() !== "/Image") continue;
    if (dict.get(PDFName.of("ColorSpace"))?.toString() !== "/DeviceRGB")
      continue;
    const width = Number(dict.get(PDFName.of("Width"))?.toString());
    const height = Number(dict.get(PDFName.of("Height"))?.toString());
    const raw = Buffer.from(inflateSync(Buffer.from(object.contents)));
    if (raw.length === width * height * 3) found = { width, height, rgb: raw };
  }
  expect(found, "the PDF holds one flattened RGB picture").not.toBeNull();
  const { width, height, rgb } = found!;
  return {
    size: [width, height],
    pixels: at.map(([x, y]) => {
      const px = Math.min(width - 1, Math.round(x * width));
      const py = Math.min(height - 1, Math.round(y * height));
      const i = (py * width + px) * 3;
      return [rgb[i], rgb[i + 1], rgb[i + 2]] as Pixel;
    }),
  };
}

/** One picture, rotated, rounded, blended and shadowed over a transparent PNG, in every format. */
test("PNG, JPEG and PDF agree on rotated, rounded, blended and transparent artwork", async ({
  page,
}) => {
  test.setTimeout(420000);
  page.setDefaultTimeout(20000);
  await showAllInspectorOptions(page);
  await createAndLoginUser(page, undefined, "studio_exports");
  const { eventId } = await createTestEvent(page, {
    title: "Export matrix",
    couple: "Ada & Kunle",
  });
  await page.goto(`/events/${eventId}/invitations/design?mode=pro`);
  const card = page
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]");
  await expect(card).toBeVisible();
  const pictures = card.locator('[data-layer-id][role="img"]');
  const saved = () =>
    expect(
      page.getByTestId("studio-top-header").getByRole("status")
    ).toHaveText(/^saved/, { timeout: 20000 });
  const field = async (label: string, value: string) => {
    const input = page.getByLabel(label, { exact: true }).first();
    await input.fill(value);
    await input.blur();
  };
  const place = async (file: string) => {
    const before = await pictures.count();
    await page
      .getByRole("button", { name: "Place image / photo", exact: true })
      .click();
    await page
      .getByLabel("Choose a picture", { exact: true })
      .setInputFiles(path.resolve(__dirname, "fixtures/designer", file));
    await expect(pictures).toHaveCount(before + 1, { timeout: 40000 });
    await saved();
    return pictures.nth(before);
  };
  const exportAs = async (format: "PNG" | "JPEG" | "PDF") => {
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await page
      .getByRole("button")
      .filter({
        hasText:
          format === "PNG"
            ? "High-Resolution PNG"
            : format === "JPEG"
              ? "Compressed JPEG"
              : "PDF for printing",
      })
      .click();
    const pending = page.waitForEvent("download", { timeout: 90000 });
    await page
      .getByRole("button", { name: `Download ${format}`, exact: true })
      .click();
    const stream = await (await pending).createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  };
  const relative = async (el: ReturnType<typeof pictures.nth>) => {
    const c = (await card.boundingBox())!;
    const b = (await el.boundingBox())!;
    return {
      x: (b.x - c.x) / c.width,
      y: (b.y - c.y) / c.height,
      w: b.width / c.width,
      h: b.height / c.height,
    };
  };

  // A transparent PNG in the corner, and a photo rotated over part of it.
  await place("transparent.png");
  await field("X", "60");
  await field("Y", "1000");
  await field("Width", "300");
  await field("Height", "300");
  const photo = await place("sample.jpg");
  await field("X", "250");
  await field("Y", "980");
  await field("Width", "420");
  await field("Height", "320");
  await field("Turn", "20");
  await field("Corner radius", "6");
  await page.getByLabel("Layer blend mode").first().selectOption("multiply");
  await field("See-through", "25");
  await page.getByRole("button", { name: "Soft", exact: true }).click();
  await saved();
  const r = await relative(photo);
  const centre: [number, number] = [r.x + r.w / 2, r.y + r.h / 2];
  const outsideRotatedCorner: [number, number] = [r.x + 0.01, r.y + 0.01];
  const overTransparent: [number, number] = [0.1, 1000 / 1512 + 0.04];
  const farPaper: [number, number] = [0.5, 0.9];
  const points = [centre, outsideRotatedCorner, overTransparent, farPaper];

  const png = await exportAs("PNG");
  const jpeg = await exportAs("JPEG");
  const pdf = await exportAs("PDF");
  const fromPng = await sample(page, png, "image/png", points);
  const fromJpeg = await sample(page, jpeg, "image/jpeg", points);
  const fromPdf = await pdfPixels(pdf, points);
  const detail = points.map((_, i) => ({
    point: ["centre", "rotated-corner", "over-transparent", "paper"][i],
    png: fromPng[i],
    jpeg: fromJpeg[i],
    pdf: fromPdf.pixels[i],
    jpegVsPng: Math.round(distance(fromPng[i], fromJpeg[i])),
    pdfVsPng: Math.round(distance(fromPng[i], fromPdf.pixels[i])),
  }));
  console.log("EXPORTS", JSON.stringify({ pdfSize: fromPdf.size, detail }));
  writeFileSync(
    test.info().outputPath("exports-results.json"),
    JSON.stringify({ pdfSize: fromPdf.size, detail }, null, 2)
  );
  // The blend, opacity and rotation make the picture differ from plain paper at its centre,
  // while a point outside the rotated frame is still paper.
  expect(distance(fromPng[0], fromPng[3])).toBeGreaterThan(15);
  expect(distance(fromPng[1], fromPng[3])).toBeLessThan(40);
  for (const i of [0, 1, 2, 3]) {
    expect(distance(fromPng[i], fromJpeg[i]), `JPEG point ${i}`).toBeLessThan(
      24
    );
    expect(
      distance(fromPng[i], fromPdf.pixels[i]),
      `PDF point ${i}`
    ).toBeLessThan(24);
  }
});
