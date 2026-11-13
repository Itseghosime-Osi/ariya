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

async function samplePixels(
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
              Math.round(x * canvas.width),
              Math.round(y * canvas.height),
              1,
              1
            ).data
          ).slice(0, 3) as Pixel
      );
    },
    { url: `data:${mime};base64,${file.toString("base64")}`, at }
  );
}

async function pdfPixels(pdf: Buffer, at: [number, number][]) {
  const doc = await PDFDocument.load(pdf);
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    const dict = object.dict;
    if (dict.get(PDFName.of("Subtype"))?.toString() !== "/Image") continue;
    if (dict.get(PDFName.of("ColorSpace"))?.toString() !== "/DeviceRGB")
      continue;
    const width = Number(dict.get(PDFName.of("Width"))?.toString());
    const height = Number(dict.get(PDFName.of("Height"))?.toString());
    const raw = Buffer.from(inflateSync(Buffer.from(object.contents)));
    if (raw.length !== width * height * 3) continue;
    return at.map(([x, y]) => {
      const i = (Math.round(y * height) * width + Math.round(x * width)) * 3;
      return [raw[i], raw[i + 1], raw[i + 2]] as Pixel;
    });
  }
  throw new Error("The PDF holds no flattened RGB picture");
}

/** Every blend mode and every typeface, exported and compared. */
test("all twelve blend modes agree across PNG, JPEG and PDF; every typeface exports like the screen", async ({
  page,
}) => {
  test.setTimeout(900000);
  page.setDefaultTimeout(30000);
  await showAllInspectorOptions(page);
  await createAndLoginUser(page, undefined, "studio_matrix");
  const { eventId } = await createTestEvent(page, {
    title: "Matrix",
    couple: "Ọlájídé & Adéṣọlá",
  });
  await page.goto(`/events/${eventId}/invitations/design?mode=pro`);
  const card = page
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]");
  await expect(card).toBeVisible();
  const field = async (label: string, value: string) => {
    const input = page.getByLabel(label, { exact: true }).first();
    await input.fill(value);
    await input.blur();
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

  // --- Blend modes: one picture over the paper and a transparent PNG.
  const pictures = card.locator('[data-layer-id][role="img"]');
  for (const file of ["transparent.png", "sample.jpg"]) {
    const before = await pictures.count();
    await page
      .getByRole("button", { name: "Place image / photo", exact: true })
      .click();
    await page
      .getByLabel("Choose a picture", { exact: true })
      .setInputFiles(path.resolve(__dirname, "fixtures/designer", file));
    await expect(pictures).toHaveCount(before + 1, { timeout: 40000 });
    if (file === "transparent.png") {
      await field("X", "60");
      await field("Y", "980");
      await field("Width", "320");
      await field("Height", "320");
    }
  }
  await field("X", "240");
  await field("Y", "980");
  await field("Width", "460");
  await field("Height", "340");
  await field("Corner radius", "0");
  const picture = pictures.nth(1);
  const c = (await card.boundingBox())!;
  const b = (await picture.boundingBox())!;
  const centre: [number, number] = [
    (b.x + b.width / 2 - c.x) / c.width,
    (b.y + b.height / 2 - c.y) / c.height,
  ];
  const overlap: [number, number] = [
    (b.x + 20 - c.x) / c.width,
    (b.y + b.height / 2 - c.y) / c.height,
  ];
  const modes = await page
    .getByLabel("Layer blend mode")
    .first()
    .locator("option")
    .evaluateAll((options) =>
      options.map((o) => (o as HTMLOptionElement).value)
    );
  expect(modes.length).toBe(12);
  const blend: Record<string, unknown>[] = [];
  let normalCentre: Pixel | null = null;
  const distinct = new Set<string>();
  for (const mode of modes) {
    await page.getByLabel("Layer blend mode").first().selectOption(mode);
    const png = await exportAs("PNG");
    const jpeg = await exportAs("JPEG");
    const pdf = await exportAs("PDF");
    const points: [number, number][] = [centre, overlap];
    const fromPng = await samplePixels(page, png, "image/png", points);
    const fromJpeg = await samplePixels(page, jpeg, "image/jpeg", points);
    const fromPdf = await pdfPixels(pdf, points);
    if (mode === modes[0]) normalCentre = fromPng[0];
    distinct.add(fromPng[0].map((v) => Math.round(v / 6)).join(","));
    blend.push({
      mode,
      centre: fromPng[0],
      jpegVsPng: Math.round(distance(fromPng[0], fromJpeg[0])),
      pdfVsPng: Math.round(distance(fromPng[0], fromPdf[0])),
      overlapJpegVsPng: Math.round(distance(fromPng[1], fromJpeg[1])),
      overlapPdfVsPng: Math.round(distance(fromPng[1], fromPdf[1])),
    });
    for (const i of [0, 1]) {
      expect(
        distance(fromPng[i], fromJpeg[i]),
        `${mode} JPEG ${i}`
      ).toBeLessThan(24);
      expect(distance(fromPng[i], fromPdf[i]), `${mode} PDF ${i}`).toBeLessThan(
        24
      );
    }
  }
  expect(normalCentre).not.toBeNull();
  // The modes really change the picture: they do not all export the same colour.
  expect(distinct.size, "distinct centre colours across modes").toBeGreaterThan(
    4
  );

  // --- Typefaces: each font exports like it looks on screen.
  await page.getByLabel("Layer blend mode").first().selectOption(modes[0]);
  await page
    .getByTestId("layer-row-names")
    .locator("[data-layer-select]")
    .click();
  const fonts = await page
    .getByLabel("Font typeface")
    .first()
    .locator("option")
    .evaluateAll((options) =>
      options.map((o) => (o as HTMLOptionElement).value)
    );
  expect(fonts.length).toBe(5);
  const fontResults: Record<string, unknown>[] = [];
  const bands: string[] = [];
  for (const font of fonts) {
    await page
      .getByTestId("layer-row-names")
      .locator("[data-layer-select]")
      .click();
    await page.getByLabel("Font typeface").first().selectOption(font);
    await page.mouse.click(c.x + 6, c.y + c.height - 6);
    await page.waitForTimeout(500);
    const names = card.locator('[data-layer-id="names"]');
    const nb = (await names.boundingBox())!;
    const live = await page.screenshot({
      clip: {
        x: nb.x - 4,
        y: nb.y - 4,
        width: nb.width + 8,
        height: nb.height + 8,
      },
    });
    const png = await exportAs("PNG");
    const result = await page.evaluate(
      async ({ liveB64, pngB64, frac }) => {
        const load = async (b64: string) => {
          const i = new Image();
          i.src = "data:image/png;base64," + b64;
          await i.decode();
          return i;
        };
        const a = await load(liveB64);
        const e = await load(pngB64);
        const W = 400;
        const H = Math.round((W * a.naturalHeight) / a.naturalWidth);
        const draw = (img: HTMLImageElement, crop?: number[]) => {
          const cv = document.createElement("canvas");
          cv.width = W;
          cv.height = H;
          const x = cv.getContext("2d")!;
          x.fillStyle = "#fff";
          x.fillRect(0, 0, W, H);
          if (crop)
            x.drawImage(img, crop[0], crop[1], crop[2], crop[3], 0, 0, W, H);
          else x.drawImage(img, 0, 0, W, H);
          return x.getImageData(0, 0, W, H).data;
        };
        const scale = e.naturalWidth / frac.cardWidth;
        const A = draw(a);
        const B = draw(e, [
          (frac.x - 4 - frac.cardX) * scale,
          (frac.y - 4 - frac.cardY) * scale,
          (frac.w + 8) * scale,
          (frac.h + 8) * scale,
        ]);
        let sum = 0;
        let dark = 0;
        for (let i = 0; i < A.length; i += 4) {
          sum +=
            (Math.abs(A[i] - B[i]) +
              Math.abs(A[i + 1] - B[i + 1]) +
              Math.abs(A[i + 2] - B[i + 2])) /
            3;
          if (B[i] < 120 && B[i + 1] < 90) dark += 1;
        }
        return { diff: +(sum / (A.length / 4)).toFixed(2), darkPixels: dark };
      },
      {
        liveB64: live.toString("base64"),
        pngB64: png.toString("base64"),
        frac: {
          x: nb.x,
          y: nb.y,
          w: nb.width,
          h: nb.height,
          cardX: c.x,
          cardY: c.y,
          cardWidth: c.width,
        },
      }
    );
    bands.push(`${font}:${result.darkPixels}`);
    fontResults.push({ font, ...result });
    expect(result.darkPixels, `${font} draws visible text`).toBeGreaterThan(
      200
    );
    expect(result.diff, `${font} export matches the screen`).toBeLessThan(26);
  }
  const written = { blend, fontResults, distinctBlendCentres: distinct.size };
  console.log("MATRIX", JSON.stringify(written));
  writeFileSync(
    test.info().outputPath("matrix-results.json"),
    JSON.stringify(written, null, 2)
  );
});
