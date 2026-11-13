import { test, expect } from "@playwright/test";
import {
  createAndLoginUser,
  createTestEvent,
  showAllInspectorOptions,
} from "./fixtures/test-helpers";
import { inspectInvitationWithRetry } from "./fixtures/invitation-image";
import { writeFileSync } from "node:fs";
test("pass placement, rounded paper and foreground readability", async ({
  page,
}) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(12000);
  await showAllInspectorOptions(page);
  if (process.env.STUDIO_TEST_EMAIL) {
    await page.goto("/sign-in");
    await page.locator("#signin-email").fill(process.env.STUDIO_TEST_EMAIL);
    await page.locator("#signin-password").fill("Celebration2026!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/events/, { timeout: 45000 });
  } else await createAndLoginUser(page, undefined, "studio_pass_layout");
  const { eventId } = await createTestEvent(page, {
    title: "Pass placement verification",
    couple: "Ada & Kunle",
  });
  await page.goto(`/events/${eventId}/invitations/design?mode=pro`);
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  const card = page
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]");
  await expect(card.locator("[data-entry-seal]")).toBeVisible();
  const download = async (format: "JSON" | "PNG") => {
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await page
      .getByRole("button")
      .filter({
        hasText:
          format === "JSON" ? "Design Backup (.json)" : "High-Resolution PNG",
      })
      .click();
    const pending = page.waitForEvent("download", { timeout: 90000 });
    await page
      .getByRole("button", { name: `Download ${format}`, exact: true })
      .click();
    const stream = await (await pending).createReadStream();
    const chunks = [];
    for await (const chunk of stream!) chunks.push(chunk);
    return Buffer.concat(chunks);
  };
  const original = JSON.parse((await download("JSON")).toString());
  const id = original.layers.find(
    (l: { kind: string }) => l.kind === "code"
  ).id;
  const open = async (design: unknown) => {
    if (
      await page.getByRole("button", { name: "Dismiss", exact: true }).count()
    )
      await page.getByRole("button", { name: "Dismiss", exact: true }).click();
    await page
      .getByLabel("Choose an invitation design backup", { exact: true })
      .setInputFiles({
        name: "pass-layout.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(design)),
      });
    await expect(
      page.getByText("Opened the design file.", { exact: true })
    ).toBeVisible();
  };
  const inside = async () => {
    // After a reload the card can still be rendering; measure it only once the seal is there.
    await expect(card.locator("[data-entry-seal]")).toBeVisible();
    const paper = (await card.boundingBox())!,
      seal = (await card.locator("[data-entry-seal]").boundingBox())!;
    expect(seal.x).toBeGreaterThanOrEqual(paper.x - 0.5);
    expect(seal.y).toBeGreaterThanOrEqual(paper.y - 0.5);
    expect(seal.x + seal.width).toBeLessThanOrEqual(
      paper.x + paper.width + 0.5
    );
    expect(seal.y + seal.height).toBeLessThanOrEqual(
      paper.y + paper.height + 0.5
    );
  };
  const cases = [];
  const scanResults: { ratio: number; angle: number; samplingMax: number }[] =
    [];
  for (const [ratio, angle, edge] of [
    [5 / 7, 45, "sharp"],
    [2.5, 135, "rounded"],
    [0.4, 30, "rounded"],
    [1, 90, "deckled"],
  ] as const) {
    const draft = structuredClone(original);
    draft.canvas = {
      ratio,
      widthPx: 1080,
      heightPx: Math.round(1080 / ratio),
      edgeStyle: edge,
      cornerRadiusPx: 500,
    };
    Object.assign(
      draft.layers.find((l: { id: string }) => l.id === id),
      { x: -500, y: 500, width: 1000, rotation: angle }
    );
    await open(draft);
    await expect
      .poll(() =>
        card.evaluate((el) => parseFloat(getComputedStyle(el).aspectRatio))
      )
      .toBeCloseTo(ratio, 5);
    await inside();
    const safe = JSON.parse((await download("JSON")).toString());
    const seal = safe.layers.find((l: { id: string }) => l.id === id);
    expect(seal.x).toBeGreaterThanOrEqual(0);
    expect(seal.y).toBeGreaterThanOrEqual(0);
    expect(seal.width).toBeGreaterThanOrEqual(16);
    if (edge === "rounded") {
      const png = await download("PNG");
      const { decoded, samplingMax } = await inspectInvitationWithRetry(
        page,
        card,
        png
      );
      expect(
        decoded === "ARY-SEAL-DEMO",
        "The rotated sample must decode through the check-in retry policy"
      ).toBe(true);
      scanResults.push({ ratio, angle, samplingMax });
    }
    cases.push({ ratio, angle, edge, clamped: true });
  }
  await open(original);
  await page
    .getByTestId(`layer-row-${id}`)
    .locator("[data-layer-select]")
    .click();
  const field = page.getByLabel("X", { exact: true });
  await field.fill("-5000");
  await field.blur();
  await inside();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(field).toHaveValue(
    String(
      Math.round(
        (original.layers.find((l: { id: string }) => l.id === id).x / 100) *
          1080
      )
    )
  );
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await inside();
  await expect(
    page.getByTestId("studio-top-header").getByRole("status")
  ).toHaveText(/^saved/, { timeout: 15000 });
  await page.reload();
  await inside();
  await open(original);
  const plate = card.locator("[data-seal-plate]");
  await expect(plate).toHaveCSS("display", "none");
  const stacked = structuredClone(original);
  const seal = stacked.layers.find((l: { id: string }) => l.id === id);
  stacked.layers.push({
    ...stacked.layers[0],
    id: "pass-overlap-fixture",
    kind: "shape",
    shape: "rect",
    text: "",
    name: "Backdrop overlap fixture",
    visible: true,
    rotation: 0,
    x: seal.x - 1,
    y: seal.y - 1,
    width: seal.width + 2,
    height: seal.width * (5 / 7) + 2,
    fill: "#111111",
    color: null,
    opacity: 1,
  });
  await open(stacked);
  await expect(plate).toHaveAttribute("data-seal-plate-required", "false");
  await expect(plate).not.toHaveCSS("display", "none");
  await expect(card.locator("[data-entry-seal]")).toHaveCSS("z-index", "1");
  await expect(
    page
      .getByTestId("layers-dock")
      .locator('li[data-testid^="layer-row-"]')
      .first()
  ).toHaveAttribute("data-testid", `layer-row-${id}`);
  const png = await download("PNG");
  const { decoded } = await inspectInvitationWithRetry(page, card, png);
  expect(
    decoded === "ARY-SEAL-DEMO",
    "The foreground sample must remain scannable over later dark artwork"
  ).toBe(true);
  await open(original);
  await expect(plate).toHaveCSS("display", "none");
  expect(runtimeErrors).toEqual([]);
  writeFileSync(
    test.info().outputPath("pass-layout-evidence.json"),
    JSON.stringify(
      {
        cases,
        scanResults,
        decoderSampling:
          "Native-first scanning with 600px/400px retries, matching the check-in fallback. Oversized raw ZXing decoding alone is not claimed.",
        checks: [
          "rotated passes remain within sharp, rounded and deckled paper",
          "numeric edits clamp with working undo/redo and reload",
          "later artwork cannot obscure the pass",
          "a backing plate appears only where needed and disappears when overlap ends",
          "native PNG independently decodes the sample over dark artwork",
        ],
      },
      null,
      2
    )
  );
});
