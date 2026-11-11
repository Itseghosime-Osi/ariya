import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync } from "node:fs";

/** Exercise offered controls against the actual Next.js editor and isolated test backend. */
test("studio offered shapes, layer operations and effects", async ({
  page,
}) => {
  test.setTimeout(240000);
  page.setDefaultTimeout(12000);
  if (process.env.STUDIO_TEST_EMAIL) {
    await page.goto("/sign-in");
    await page.locator("#signin-email").fill(process.env.STUDIO_TEST_EMAIL);
    await page.locator("#signin-password").fill("Celebration2026!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/events/, { timeout: 45000 });
  } else await createAndLoginUser(page, undefined, "studio_controls");
  const { eventId } = await createTestEvent(page, {
    title: "Studio control verification",
    couple: "Ada & Kunle",
  });
  await page.goto(`/events/${eventId}/invitations/design?mode=pro`);
  const card = page
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]");
  await expect(card).toBeVisible();
  const selected = () => page.getByTestId("inspector-layer");
  const geometry = page.getByLabel("Shape geometry");
  const numeric = async (label: string, value: string) => {
    const field = page.getByLabel(label, { exact: true });
    await field.fill(value);
    await field.blur();
  };
  const range = async (label: string, value: number) => {
    const field = page.getByLabel(label, { exact: true });
    const { min, max, step } = await field.evaluate((el) => ({
      min: Number((el as HTMLInputElement).min),
      max: Number((el as HTMLInputElement).max),
      step: Number((el as HTMLInputElement).step) || 1,
    }));
    const fromEnd = max - value < value - min;
    await field.press(fromEnd ? "End" : "Home");
    for (
      let i = 0;
      i < Math.round((fromEnd ? max - value : value - min) / step);
      i++
    )
      await field.press(fromEnd ? "ArrowLeft" : "ArrowRight");
    await expect(field).toHaveValue(String(value));
  };
  const json = async () => {
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await page
      .getByRole("button")
      .filter({ hasText: "Design Backup (.json)" })
      .click();
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download JSON", exact: true })
      .click();
    const stream = await (await pending).createReadStream();
    const chunks = [];
    for await (const chunk of stream!) chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString());
  };
  const evidence: { ids: number[]; name: string }[] = [];
  const step = async (ids: number[], name: string, fn: () => Promise<void>) => {
    console.log("Checking:", name);
    await test.step(name, fn);
    evidence.push({ ids, name });
    writeFileSync(
      test.info().outputPath("controls-evidence.json"),
      JSON.stringify(evidence, null, 2)
    );
  };
  let id = "";
  const artwork = () => card.locator(`[data-layer-id="${id}"]`);
  await step(
    [90, 94, 166],
    "Every offered shape creates valid visible artwork",
    async () => {
      for (const [shape, label] of [
        ["rect", "Rectangle"],
        ["ellipse", "Circle / Oval"],
        ["line", "Line Divider"],
        ["arch", "Cathedral Arch"],
        ["star", "Star / Sparkle"],
        ["diamond", "Diamond"],
        ["crest", "Crest / Shield"],
        ["triangle", "Triangle"],
      ]) {
        await page
          .getByRole("button", {
            name: "Vector Shapes & Geometry",
            exact: true,
          })
          .click();
        await page
          .getByRole("menu", { name: "Shape presets", exact: true })
          .getByRole("menuitem", { name: label, exact: true })
          .click();
        id = (await card
          .locator("[data-layer-id]")
          .last()
          .getAttribute("data-layer-id"))!;
        await expect(geometry).toHaveValue(shape);
        await expect(artwork()).toBeVisible();
        const box = await artwork().boundingBox();
        expect(box!.width).toBeGreaterThan(0);
        expect(box!.height).toBeGreaterThan(0);
      }
      await geometry.selectOption("rect");
    }
  );
  await step(
    [97, 98, 158, 178, 179, 198, 199, 201, 202, 203, 204],
    "Fill, outline, effects and compositing update live artwork",
    async () => {
      await selected()
        .getByRole("button", { name: "gradient", exact: true })
        .click();
      await expect(artwork()).toHaveCSS("background-image", /linear-gradient/);
      // Presets include both gradient families.
      await page
        .getByRole("button", { name: "Golden Halo", exact: true })
        .click();
      await expect(artwork()).toHaveCSS("background-image", /radial-gradient/);
      await selected()
        .getByRole("button", { name: "none", exact: true })
        .first()
        .click();
      await expect(artwork()).toHaveCSS("background-image", "none");
      await selected()
        .getByRole("button", { name: "solid", exact: true })
        .click();
      const imported = await json();
      const shape = imported.layers.find((l: { id: string }) => l.id === id);
      shape.gradient = "linear-gradient(90deg, #123456, #654321)";
      shape.fill = "#123456";
      await page
        .locator('input[type="file"][accept="application/json,.json"]')
        .first()
        .setInputFiles({
          name: "mixed-fill.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(imported)),
        });
      await page
        .getByTestId(`layer-row-${id}`)
        .locator("[data-layer-select]")
        .click();
      await expect(artwork()).toHaveCSS("background-image", /linear-gradient/);
      const accessibility = await new AxeBuilder({ page })
        .include('[data-testid="invitation-designer"]')
        .exclude("[data-invitation-canvas]")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        accessibility.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        }))
      ).toEqual([]);
      await selected()
        .getByRole("button", { name: "solid", exact: true })
        .click();
      await expect(artwork()).toHaveCSS("background-image", "none");
      const fill = page.getByLabel("Fill colour hex code", { exact: true });
      await fill.fill("#123456");
      await fill.blur();
      await expect(artwork()).toHaveCSS("background-color", "rgb(18, 52, 86)");
      const stroke = page.getByLabel("Outline hex code", { exact: true });
      await stroke.fill("#654321");
      await stroke.blur();
      await numeric("Outline width", "4");
      await expect(artwork()).toHaveCSS("border-top-color", "rgb(101, 67, 33)");
      for (const mode of [
        "normal",
        "multiply",
        "screen",
        "overlay",
        "darken",
        "lighten",
        "color-dodge",
        "color-burn",
        "hard-light",
        "soft-light",
        "difference",
        "exclusion",
      ]) {
        await page
          .getByLabel("Layer blend mode", { exact: true })
          .first()
          .selectOption(mode);
        await expect(artwork()).toHaveCSS("mix-blend-mode", mode);
      }
      for (const [label, amount, css] of [
        ["Gaussian blur", 3, "blur(3px)"],
        ["Brightness", 20, "brightness(1.2)"],
        ["Contrast", -20, "contrast(0.8)"],
        ["Saturation", 40, "saturate(1.4)"],
      ] as const) {
        await range(label, amount);
        await expect(artwork()).toHaveCSS(
          "filter",
          new RegExp(css.replace(/[()]/g, "\\$&"))
        );
      }
      await range("Opacity percentage", 65);
      await expect(artwork()).toHaveCSS("opacity", "0.65");
      for (const effect of ["Soft", "Foil", "Glow"]) {
        await selected()
          .getByRole("button", { name: effect, exact: true })
          .click();
        await expect(artwork()).toHaveCSS("filter", /drop-shadow/);
      }
      await selected()
        .getByRole("button", { name: "None", exact: true })
        .last()
        .click();
      await expect(artwork()).not.toHaveCSS("filter", /drop-shadow/);
    }
  );
  await step(
    [46, 47, 167, 169, 171, 173, 180],
    "Layer naming, visibility, stacking, flip, rotate and deletion are reversible",
    async () => {
      const row = page.getByTestId(`layer-row-${id}`);
      await row.locator("[data-layer-select]").dblclick();
      const name = page.getByLabel("Layer name", { exact: true });
      await name.fill("Burgundy accent");
      await name.press("Enter");
      await expect(row.locator("[data-layer-select]")).toHaveText(
        "Burgundy accent"
      );
      await row
        .getByRole("button", { name: "Hide Burgundy accent", exact: true })
        .click();
      await expect(artwork()).toHaveCount(0);
      await row
        .getByRole("button", { name: "Show Burgundy accent", exact: true })
        .click();
      await expect(artwork()).toBeVisible();
      for (const direction of ["horizontal", "vertical"]) {
        const flip = page.getByRole("button", {
          name: `Flip ${direction}`,
          exact: true,
        });
        await flip.click();
        await expect(flip).toHaveAttribute("aria-pressed", "true");
        await expect(artwork()).not.toHaveCSS("transform", "none");
        await flip.click();
        await expect(flip).toHaveAttribute("aria-pressed", "false");
      }
      await numeric("Turn", "0");
      await page
        .getByRole("button", {
          name: "Rotate 90 degrees clockwise",
          exact: true,
        })
        .click();
      await expect(page.getByLabel("Turn", { exact: true })).toHaveValue("90");
      await page
        .getByRole("button", {
          name: "Rotate 90 degrees clockwise",
          exact: true,
        })
        .click();
      await expect(page.getByLabel("Turn", { exact: true })).toHaveValue("180");
      await page
        .getByRole("button", { name: "Send to back", exact: true })
        .click();
      expect((await json()).layers[0].id).toBe(id);
      await page
        .getByRole("button", { name: "Bring to front", exact: true })
        .click();
      expect((await json()).layers.at(-1).id).toBe(id);
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await expect(artwork()).toHaveCount(0);
      await page.getByRole("button", { name: "Undo", exact: true }).click();
      await expect(artwork()).toBeVisible();
      await expect(row.locator("[data-layer-select]")).toHaveText(
        "Burgundy accent"
      );
      await expect(
        page.getByTestId("studio-top-header").getByRole("status")
      ).toContainText("saved", { timeout: 15000 });
    }
  );
});
