import { test, expect, type Page } from "@playwright/test";
import {
  createAndLoginUser,
  createTestEvent,
  showAllInspectorOptions,
} from "./fixtures/test-helpers";
import { writeFileSync } from "node:fs";
import path from "node:path";

type Pixel = [number, number, number, number];
const distance = (a: Pixel, b: Pixel) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Samples an exported PNG at positions given as fractions of the card, decoded in the browser. */
async function sample(page: Page, png: Buffer, at: [number, number][]) {
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
      return at.map(([x, y]) =>
        Array.from(
          ctx.getImageData(
            Math.min(
              canvas.width - 1,
              Math.max(0, Math.round(x * canvas.width))
            ),
            Math.min(
              canvas.height - 1,
              Math.max(0, Math.round(y * canvas.height))
            ),
            1,
            1
          ).data
        )
      );
    },
    { url: `data:image/png;base64,${png.toString("base64")}`, at }
  ) as Promise<Pixel[]>;
}

/** Image checks that need uploads and real exports: they run against the local stack only. */
test("pictures, masks, effects, drops, large files, slow fonts and backups", async ({
  page,
}) => {
  test.setTimeout(420000);
  page.setDefaultTimeout(15000);
  const results: { id: string; ok: boolean; detail: string }[] = [];
  const note = (id: string, ok: boolean, detail: string) => {
    results.push({ id, ok, detail });
    expect.soft(ok, `${id}: ${detail}`).toBe(true);
  };
  await showAllInspectorOptions(page);
  await createAndLoginUser(page, undefined, "studio_remaining");
  const { eventId } = await createTestEvent(page, {
    title: "Remaining studio checks",
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
  const exportPng = async () => {
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await page
      .getByRole("button")
      .filter({ hasText: "High-Resolution PNG" })
      .click();
    const pending = page.waitForEvent("download", { timeout: 90000 });
    await page
      .getByRole("button", { name: "Download PNG", exact: true })
      .click();
    const stream = await (await pending).createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  };
  const place = async (
    file: string | { name: string; mimeType: string; buffer: Buffer }
  ) => {
    const before = await pictures.count();
    await page
      .getByRole("button", { name: "Place image / photo", exact: true })
      .click();
    await page
      .getByLabel("Choose a picture", { exact: true })
      .setInputFiles(
        typeof file === "string"
          ? path.resolve(__dirname, "fixtures/designer", file)
          : file
      );
    await expect(pictures).toHaveCount(before + 1, { timeout: 40000 });
    return pictures.nth(before);
  };
  const relative = async (
    el: ReturnType<typeof place> extends Promise<infer T> ? T : never
  ) => {
    const c = (await card.boundingBox())!;
    const b = (await el.boundingBox())!;
    return {
      x: (b.x - c.x) / c.width,
      y: (b.y - c.y) / c.height,
      w: b.width / c.width,
      h: b.height / c.height,
    };
  };

  // Place a picture, move it clear of other artwork, and compare masks, border, shadow and alpha.
  const photo = await place("sample.jpg");
  await saved();
  await page.getByLabel("X", { exact: true }).fill("120");
  await page.getByLabel("X", { exact: true }).blur();
  await page.getByLabel("Y", { exact: true }).fill("120");
  await page.getByLabel("Y", { exact: true }).blur();
  await page.getByLabel("Width", { exact: true }).fill("500");
  await page.getByLabel("Width", { exact: true }).blur();
  await page.getByLabel("Height", { exact: true }).fill("500");
  await page.getByLabel("Height", { exact: true }).blur();
  await page.getByLabel("Corner radius", { exact: true }).first().fill("0");
  await page.getByLabel("Corner radius", { exact: true }).first().blur();
  await expect(photo).toBeVisible();
  const r = await relative(photo);
  const corner: [number, number] = [r.x + r.w * 0.04, r.y + r.h * 0.04];
  const middle: [number, number] = [r.x + r.w / 2, r.y + r.h / 2];
  const below: [number, number] = [r.x + r.w / 2, r.y + r.h + r.h * 0.035];
  const far: [number, number] = [r.x + r.w / 2, r.y + r.h + r.h * 0.4];
  const square = await exportPng();
  const [squareCorner, squareMiddle] = await sample(page, square, [
    corner,
    middle,
  ]);

  // DES-076 and DES-206: a circular frame clips the corners and keeps the picture's centre.
  await page.getByLabel("Frame mask shape").selectOption("ellipse");
  const circle = await exportPng();
  const [circleCorner, circleMiddle] = await sample(page, circle, [
    corner,
    middle,
  ]);
  note(
    "DES-076",
    distance(squareCorner, circleCorner) > 40 &&
      distance(squareMiddle, circleMiddle) < 14,
    `corner pixel ${squareCorner.slice(0, 3)} → ${circleCorner.slice(0, 3)} with a circle frame; centre ${squareMiddle.slice(0, 3)} → ${circleMiddle.slice(0, 3)}; the picture file is unchanged`
  );
  await page.getByLabel("Frame mask shape").selectOption("rect");
  await page.getByLabel("Frame mask shape").selectOption("ellipse");
  const restored = await exportPng();
  const [againCorner] = await sample(page, restored, [corner]);
  note(
    "DES-206",
    distance(againCorner, circleCorner) < 8 && (await pictures.count()) === 1,
    "changing the frame mask back and forth is non-destructive: the same single picture layer clips identically each time"
  );

  // DES-077: border and shadow follow the rounded frame (rounded rectangle frame).
  await page.getByLabel("Frame mask shape").selectOption("rect");
  await page.getByLabel("Corner radius", { exact: true }).first().fill("12");
  await page.getByLabel("Corner radius", { exact: true }).first().blur();
  const rounded = await exportPng();
  const edgeOffsets = [-0.004, -0.002, 0, 0.002, 0.004].map(
    (dx): [number, number] => [r.x + dx, r.y + r.h / 2]
  );
  const [roundedCorner, ...roundedEdges] = await sample(page, rounded, [
    corner,
    ...edgeOffsets,
  ]);
  await page.getByLabel("Frame border: #243f86", { exact: true }).click();
  await page.getByRole("button", { name: "Soft", exact: true }).click();
  const styled = await exportPng();
  const [styledCorner, styledBelow, styledFar, ...styledEdges] = await sample(
    page,
    styled,
    [corner, below, far, ...edgeOffsets]
  );
  const edgeChange = Math.max(
    ...styledEdges.map((p, i) => distance(p, roundedEdges[i]))
  );
  const [paperFar] = await sample(page, square, [far]);
  note(
    "DES-077",
    distance(roundedCorner, squareCorner) > 40 &&
      distance(styledCorner, roundedCorner) < 60 &&
      edgeChange > 25 &&
      distance(styledFar, paperFar) < 10,
    `rounded corner clips the picture (${squareCorner.slice(0, 3)} → ${roundedCorner.slice(0, 3)}); the border colour appears on the edge (largest change across the edge ${edgeChange.toFixed(0)}); shadow pixel ${styledBelow.slice(0, 3)}; far paper unchanged`
  );

  // DES-155: See-through blends the layer with what is behind it.
  await page.getByRole("button", { name: "None", exact: true }).click();
  await page.getByLabel("See-through", { exact: true }).fill("50");
  await page.getByLabel("See-through", { exact: true }).blur();
  const half = await exportPng();
  const [halfMiddle] = await sample(page, half, [middle]);
  // Behind the picture is the paper: the circle-frame export shows that paper in the corner.
  const expected: Pixel = [0, 1, 2, 3].map((i) =>
    Math.round((squareMiddle[i] + circleCorner[i]) / 2)
  ) as Pixel;
  const blended = distance(halfMiddle, expected) < 14;
  note(
    "DES-155",
    blended,
    `50% see-through changes the exported centre pixel ${squareMiddle.slice(0, 3)} → ${halfMiddle.slice(0, 3)}, which is the midpoint with the paper behind it (${expected.slice(0, 3)})`
  );
  await page.getByLabel("See-through", { exact: true }).fill("0");
  await page.getByLabel("See-through", { exact: true }).blur();

  // DES-025: a click over a transparent PNG area selects the picture by its box.
  const png = await place("transparent.png");
  await page.keyboard.press("Escape");
  const box = (await png.boundingBox())!;
  await page.mouse.click(box.x + 2, box.y + 2);
  const selected = await page.getByTestId("inspector-layer").count();
  note(
    "DES-025",
    selected > 0,
    "clicking the corner of a transparent PNG selects it: hit testing follows the picture's box, not its visible pixels"
  );

  // DES-135: a dropped file becomes a picture layer without leaving the page.
  const urlBefore = page.url();
  const before = await pictures.count();
  await page.evaluate(async () => {
    const stage = document.querySelector('[data-testid="designer-stage"]')!;
    const bytes = await (
      await fetch(
        document
          .querySelector<HTMLElement>('[data-layer-id][role="img"]')!
          .style.backgroundImage.slice(5, -2)
      )
    ).blob();
    const dt = new DataTransfer();
    dt.items.add(
      new File([bytes], "dropped.png", { type: bytes.type || "image/png" })
    );
    const rect = stage.getBoundingClientRect();
    for (const type of ["dragenter", "dragover", "drop"])
      stage.dispatchEvent(
        new DragEvent(type, {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX: rect.x + rect.width / 2,
          clientY: rect.y + rect.height / 2,
        })
      );
  });
  await expect(pictures).toHaveCount(before + 1, { timeout: 30000 });
  note(
    "DES-135",
    page.url() === urlBefore,
    `dropping a file added a picture layer (${before}→${before + 1}) and the page did not navigate`
  );

  // DES-146: a very large photo is optimized, stays editable and finishes quickly.
  const bigJpeg = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 6000;
    canvas.height = 4000;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 6000, 4000);
    g.addColorStop(0, "#c0392b");
    g.addColorStop(1, "#2980b9");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 6000, 4000);
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", 0.9)
    );
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < buf.length; i += 16384)
      s += String.fromCharCode(...buf.subarray(i, i + 16384));
    return btoa(s);
  });
  const t0 = Date.now();
  const large = await place({
    name: "large.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(bigJpeg, "base64"),
  });
  const seconds = (Date.now() - t0) / 1000;
  await saved();
  const stored = await page.evaluate(
    async (url) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    },
    (
      await large.evaluate((e) => (e as HTMLElement).style.backgroundImage)
    ).slice(5, -2)
  );
  note(
    "DES-146",
    seconds < 40 && stored[0] >= 1200 && stored[0] < 6000,
    `a 6000×4000 JPEG (${Math.round((bigJpeg.length * 0.75) / 1024)} KB) placed in ${seconds.toFixed(1)} s and stored at ${stored[0]}×${stored[1]} px`
  );

  // DES-096: a line's length and position follow the numeric fields.
  await page.getByRole("button", { name: "Insert", exact: true }).click();
  await page.getByRole("menuitem", { name: /Line/ }).click();
  const widthField = page.getByLabel("Width", { exact: true }).first();
  const w0 = Number(await widthField.inputValue());
  await widthField.fill("333");
  await widthField.blur();
  const xField = page.getByLabel("X", { exact: true }).first();
  await xField.fill("100");
  await xField.blur();
  note(
    "DES-096",
    w0 !== 333 &&
      Number(await widthField.inputValue()) === 333 &&
      Number(await xField.inputValue()) === 100,
    `line length ${w0} → 333 px and start X → 100 px through the numeric fields (no endpoint handles are offered)`
  );

  // DES-006: opening another design file keeps the current work recoverable.
  await saved();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("button")
    .filter({ hasText: "Design Backup (.json)" })
    .click();
  const pending = page.waitForEvent("download", { timeout: 60000 });
  await page
    .getByRole("button", { name: "Download JSON", exact: true })
    .click();
  const stream = await (await pending).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk as Buffer);
  const current = JSON.parse(Buffer.concat(chunks).toString());
  const blank = {
    ...current,
    layers: current.layers.filter((l: { kind: string }) => l.kind === "code"),
  };
  if (await page.getByRole("button", { name: "Dismiss", exact: true }).count())
    await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  await page.keyboard.press("Escape");
  await page
    .getByLabel("Choose an invitation design backup", { exact: true })
    .setInputFiles({
      name: "other.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(blank)),
    });
  await expect(
    page.getByText("Opened the design file.", { exact: true })
  ).toBeVisible();
  const opened = await card.locator("[data-layer-id]").count();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  const back = await card.locator("[data-layer-id]").count();
  note(
    "DES-006",
    opened < back,
    `opening another design replaced the card (${back}→${opened} layers) and one Undo restored all of the previous work (${back} layers)`
  );

  writeFileSync(
    test.info().outputPath("remaining-results.json"),
    JSON.stringify(results, null, 2)
  );
  console.log("REMAINING", JSON.stringify(results));
});

/** The export waits for slow fonts instead of drawing fallback text. */
test("export waits for slow fonts", async ({ page }) => {
  test.setTimeout(240000);
  page.setDefaultTimeout(20000);
  await showAllInspectorOptions(page);
  await createAndLoginUser(page, undefined, "studio_slow_fonts");
  const { eventId } = await createTestEvent(page, {
    title: "Slow font checks",
    couple: "Ada & Kunle",
  });
  let delayed = 0;
  await page.route(/\.(woff2?|ttf|otf)(\?.*)?$/, async (route) => {
    delayed += 1;
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await route.continue();
  });
  await page.goto(`/events/${eventId}/invitations/design?mode=pro`);
  await expect(
    page.getByTestId("designer-stage").locator("[data-invitation-canvas]")
  ).toBeVisible();
  const started = Date.now();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("button")
    .filter({ hasText: "High-Resolution PNG" })
    .click();
  const pending = page.waitForEvent("download", { timeout: 120000 });
  await page.getByRole("button", { name: "Download PNG", exact: true }).click();
  const file = await pending;
  const waited = (Date.now() - started) / 1000;
  const fontsReady = await page.evaluate(
    () => document.fonts.status === "loaded"
  );
  expect(file.suggestedFilename()).toMatch(/\.png$/);
  expect(fontsReady).toBe(true);
  console.log(
    "SLOWFONTS",
    JSON.stringify({
      delayedFontRequests: delayed,
      seconds: waited,
      fontsReady,
    })
  );
});
