import { test, expect, type Page } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

test.afterEach(async ({ page }, info) => {
  if (
    info.status === info.expectedStatus ||
    !page.url().includes("/invitations/design")
  )
    return;
  await page.screenshot({ path: info.outputPath("designer-failure.png") });
  console.log(
    "Editor bounds:",
    await page.evaluate(() => {
      const out: Record<string, unknown> = {};
      for (const id of [
        "invitation-designer",
        "studio-top-header",
        "studio-statusbar",
        "designer-stage",
      ]) {
        const el = document.querySelector(`[data-testid="${id}"]`)!;
        const rect = el.getBoundingClientRect();
        const css = getComputedStyle(el);
        out[id] = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          position: css.position,
          translate: css.translate,
          transform: css.transform,
        };
      }
      return out;
    })
  );
});

/** Uses a local stack only; no hosted accounts, email provider or payment service. */
test("invitation studio: persistence, recovery, tools and responsive acceptance", async ({
  page,
  context,
}) => {
  test.setTimeout(900_000);
  page.setDefaultTimeout(12000);
  const evidence: Array<{ ids: number[]; name: string; result: string }> = [];
  const record = async (
    ids: number[],
    name: string,
    run: () => Promise<void>
  ) => {
    console.log("Checking:", name);
    await test.step(name, async () => {
      await run();
      evidence.push({ ids, name, result: "Pass" });
      mkdirSync(test.info().outputDir, { recursive: true });
      writeFileSync(
        test.info().outputPath("checklist-evidence.json"),
        JSON.stringify(evidence, null, 2)
      );
    });
  };
  const card = () =>
    page.locator('[data-testid="designer-stage"] [data-invitation-canvas]');
  const saved = async (p: Page = page) => {
    await expect(
      p.getByTestId("studio-top-header").getByRole("status")
    ).toContainText("saved", { timeout: 15000 });
    await expect(p.getByTestId("studio-error-alert")).toHaveCount(0);
  };
  const value = async (label: string, text: string, p: Page = page) => {
    const field = p.getByLabel(label, { exact: true });
    await field.fill(text);
    await field.blur();
  };
  const insert = async (label: string) => {
    await page.getByRole("button", { name: "Insert", exact: true }).click();
    await page.getByRole("menuitem", { name: new RegExp(`^${label}`) }).click();
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
  const select = async (id: string, p: Page = page) => {
    const row = p.getByTestId(`layer-row-${id}`);
    await row.locator("[title]").first().click();
  };

  if (process.env.STUDIO_TEST_EMAIL) {
    await page.goto("/sign-in");
    await page.locator("#signin-email").fill(process.env.STUDIO_TEST_EMAIL);
    await page.locator("#signin-password").fill("Celebration2026!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/events/);
  } else await createAndLoginUser(page, undefined, "studio_acceptance");
  const { eventId } = await createTestEvent(page, {
    title: "Àríyá studio acceptance",
    couple: "Ọlá & Adéṣọlá",
  });
  const url = `/events/${eventId}/invitations/design?mode=pro`;
  await page.goto(url);
  await expect(page.getByTestId("invitation-designer")).toBeVisible();
  await saved();

  const houseTemplate = await json();
  await record(
    [214, 215, 250],
    "Save real design and reload through Next.js",
    async () => {
      await select("names");
      await page
        .getByRole("textbox", { name: "Text", exact: true })
        .fill("Ọlá & Adéṣọlá — our celebration");
      await saved();
      await page.reload();
      await select("names");
      await expect(
        page.getByRole("textbox", { name: "Text", exact: true })
      ).toHaveValue("Ọlá & Adéṣọlá — our celebration");
      await page.getByRole("radio", { name: "Simple", exact: true }).click();
      await page.getByRole("radio", { name: "Pro", exact: true }).click();
      await select("names");
      await expect(
        page.getByRole("textbox", { name: "Text", exact: true })
      ).toHaveValue("Ọlá & Adéṣọlá — our celebration");
    }
  );
  await record(
    [36, 37, 42, 43, 44, 47, 50, 63, 67, 86],
    "Persist geometry, aspect lock and independent corners",
    async () => {
      await insert("Rectangle");
      await value("Width", "400");
      await value("Height", "200");
      await page
        .getByRole("button", { name: "Lock aspect ratio", exact: true })
        .click();
      await value("Width", "600");
      await expect(page.getByLabel("Height", { exact: true })).toHaveValue(
        "300"
      );
      await value("Turn", "90");
      await value("Corner radius", "4");
      await page
        .getByRole("button", { name: "Linked (Uniform)", exact: true })
        .click();
      await value("Top Left", "7");
      await saved();
      const backup = await json();
      const shape = backup.layers.at(-1);
      expect(shape.aspectLocked).toBe(true);
      expect(shape.radiusTL).toBe(7);
      await page.reload();
      await select(shape.id);
      await expect(
        page.getByRole("button", { name: "Lock aspect ratio" })
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByLabel("Top Left", { exact: true })).toHaveValue(
        "7"
      );
      await value("Top Left", "-10");
      await expect(page.getByLabel("Top Left", { exact: true })).toHaveValue(
        "0"
      );
      await value("Top Left", "abc");
      await expect(page.getByLabel("Top Left", { exact: true })).toHaveValue(
        "0"
      );
      await value("Width", "0");
      expect(
        Number(await page.getByLabel("Width", { exact: true }).inputValue())
      ).toBeGreaterThan(0);
      await page.getByRole("button", { name: "Undo", exact: true }).click();
    }
  );
  await record(
    [217, 218, 223],
    "Recover a failed save after reload without losing edits",
    async () => {
      await saved();
      await select("names");
      await context.setOffline(true);
      await page
        .getByRole("textbox", { name: "Text", exact: true })
        .fill("Recovered Ọlá & Adéṣọlá");
      await expect(page.getByTestId("studio-error-alert")).toBeVisible({
        timeout: 15000,
      });
      await context.setOffline(false);
      await page.reload();
      await select("names");
      await expect(
        page.getByRole("textbox", { name: "Text", exact: true })
      ).toHaveValue("Recovered Ọlá & Adéṣọlá");
      await saved();
    }
  );
  await record([219], "Reject stale writes from a second tab", async () => {
    await saved();
    const second = await context.newPage();
    await second.goto(url);
    await expect(second.getByTestId("invitation-designer")).toBeVisible();
    await select("names");
    await page
      .getByRole("textbox", { name: "Text", exact: true })
      .fill("First tab version");
    await saved();
    await select("names", second);
    await second
      .getByRole("textbox", { name: "Text", exact: true })
      .fill("Second tab unsaved version");
    await expect(second.getByTestId("studio-error-alert")).toContainText(
      "changed in another tab",
      { timeout: 15000 }
    );
    await second.close();
    await page.reload();
    await select("names");
    await expect(
      page.getByRole("textbox", { name: "Text", exact: true })
    ).toHaveValue("First tab version");
  });
  await record(
    [110, 112, 113, 114, 116, 125, 128, 129, 130],
    "Inline text edit, cancellation and document undo",
    async () => {
      await page.keyboard.press("Control+d");
      const names = card().locator('[data-layer-id="names"]');
      await names.dblclick({ position: { x: 30, y: 10 } });
      const edit = card().getByRole("textbox");
      await expect(edit).toBeFocused();
      await edit.fill("Àríyá — Ọlá\nAdéṣọlá");
      await page.getByRole("button", { name: "View", exact: true }).click();
      await page.keyboard.press("Escape");
      await page.keyboard.press("Control+z");
      await expect(card().locator('[data-layer-id="names"]')).toHaveText(
        "First tab version"
      );
      await page.keyboard.press("Control+Shift+z");
      await expect(card().locator('[data-layer-id="names"]')).toContainText(
        "Adéṣọlá"
      );
      await names.dblclick({ position: { x: 30, y: 10 } });
      await edit.fill("Cancelled edit");
      await edit.press("Escape");
      await expect(names).toContainText("Adéṣọlá");
      await expect(names).not.toHaveText("Cancelled edit");
      await saved();
    }
  );
  await record(
    [220, 221, 222],
    "Design backup restores editable structure safely",
    async () => {
      await page.keyboard.press("Control+d");
      const backup = await json();
      const picker = page
        .locator('input[type="file"][accept="application/json,.json"]')
        .first();
      await picker.setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from("{invalid"),
      });
      await expect(
        page.getByText("That file is not an Àríyá invitation design.", {
          exact: true,
        })
      ).toBeVisible();
      await picker.setInputFiles({
        name: "backup.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(backup)),
      });
      await saved();
      await page.reload();
      const restored = await json();
      expect(restored.layers).toEqual(backup.layers);
    }
  );

  await record(
    [153, 154, 156, 164],
    "Colour panel edits house text and synchronizes every RGB channel",
    async () => {
      await select("names");
      await page
        .getByRole("button", { name: "Color & Swatches", exact: true })
        .click();
      await page.getByTestId("hex-color-input").fill("#123456");
      await expect(page.getByLabel("Red channel")).toHaveValue("18");
      await expect(page.getByLabel("Green channel")).toHaveValue("52");
      await expect(page.getByLabel("Blue channel")).toHaveValue("86");
      await page.getByLabel("Blue channel").fill("128");
      await page.getByLabel("Blue channel").blur();
      await expect(card().locator('[data-layer-id="names"]')).toHaveCSS(
        "color",
        "rgb(18, 52, 128)"
      );
      await page
        .getByRole("group", { name: "Saturation and brightness", exact: true })
        .press("ArrowLeft");
      await saved();
      await page
        .getByRole("button", { name: "Properties", exact: true })
        .click();
    }
  );
  await record(
    [189, 190, 191],
    "Grid snapping and independent guide locking",
    async () => {
      const document = await json();
      const rectangle = document.layers.find(
        (l: { kind: string }) => l.kind === "shape"
      );
      await select(rectangle.id);
      await value("Turn", "0");
      await value("Width", "300");
      await value("X", "300");
      await value("Y", "400");
      await page
        .getByRole("button", { name: "Snap to grid", exact: true })
        .click();
      const r = (await card()
        .locator(`[data-layer-id="${rectangle.id}"]`)
        .boundingBox())!;
      await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
      await page.mouse.down();
      await page.mouse.move(r.x + r.width / 2 + 17, r.y + r.height / 2 + 13, {
        steps: 5,
      });
      await page.mouse.up();
      const x = Number(
        await page.getByLabel("X", { exact: true }).inputValue()
      );
      const y = Number(
        await page.getByLabel("Y", { exact: true }).inputValue()
      );
      expect(Math.min(x % 100, 100 - (x % 100))).toBeLessThanOrEqual(1);
      expect(Math.min(y % 100, 100 - (y % 100))).toBeLessThanOrEqual(1);
      await page
        .getByRole("button", { name: "Snap to grid", exact: true })
        .click();
      const ruler = (await page
        .getByTitle("Click and drag down to pull out a horizontal guide line", {
          exact: true,
        })
        .boundingBox())!;
      await page.mouse.move(ruler.x + 150, ruler.y + 10);
      await page.mouse.down();
      await page.mouse.move(ruler.x + 150, ruler.y + 160, { steps: 5 });
      await page.mouse.up();
      const guide = page.locator("[data-guide-id]").first();
      await expect(guide).toBeVisible();
      const before = await guide.getAttribute("style");
      await page.getByRole("button", { name: "View", exact: true }).click();
      await page
        .getByRole("menuitem", { name: "Lock guides", exact: true })
        .click();
      const g = (await guide.boundingBox())!;
      await page.mouse.move(g.x + 10, g.y + g.height / 2);
      await page.mouse.down();
      await page.mouse.move(g.x + 10, g.y + 45);
      await page.mouse.up();
      expect(await guide.getAttribute("style")).toBe(before);
      await page.getByRole("button", { name: "View", exact: true }).click();
      await page
        .getByRole("menuitem", { name: "Unlock guides", exact: true })
        .click();
      await page.getByRole("button", { name: "View", exact: true }).click();
      await page
        .getByRole("menuitem", { name: "Clear guides", exact: true })
        .click();
      await expect(guide).toHaveCount(0);
      await saved();
    }
  );
  await record(
    [133, 134, 136, 137, 138, 146, 147, 148, 150],
    "Upload PNG, JPEG and WebP through local storage and preserve their editable frames",
    async () => {
      const picker = page.getByLabel("Choose a picture", { exact: true });
      let uploaded = 0;
      for (const file of [
        "transparent.png",
        "sample.jpg",
        "sample.webp",
        "orientation.jpg",
      ]) {
        await page
          .getByRole("button", { name: "Place image / photo", exact: true })
          .click();
        await picker.setInputFiles(
          path.resolve(__dirname, "fixtures/designer", file)
        );
        await expect(card().locator('[data-layer-id][role="img"]')).toHaveCount(
          ++uploaded,
          { timeout: 15000 }
        );
        await saved();
      }
      const backup = await json();
      const photos = backup.layers.filter(
        (l: { kind: string }) => l.kind === "image"
      );
      expect(photos).toHaveLength(4);
      await page.reload();
      for (const image of photos) {
        const img = card().locator(`[data-layer-id="${image.id}"]`);
        await expect(img).toBeVisible();
        await expect(img).toHaveCSS(
          "background-image",
          new RegExp("event-covers")
        );
        const response = await page.request.get(image.imageUrl);
        expect(response.status()).toBe(200);
      }
      const photo = photos.at(-1);
      await select(photo.id);
      await page.getByRole("radio", { name: "Show all", exact: true }).click();
      await expect(card().locator(`[data-layer-id="${photo.id}"]`)).toHaveCSS(
        "background-size",
        "contain"
      );
      await page
        .getByRole("radio", { name: "Fill the box", exact: true })
        .click();
      await value("Pan X", "20");
      await value("Pan Y", "80");
      await saved();
      await page
        .getByRole("button", { name: "Replace picture", exact: true })
        .click();
      await picker.setInputFiles(
        path.resolve(__dirname, "fixtures/designer/sample.jpg")
      );
      await saved();
      const replaced = (await json()).layers.find(
        (l: { id: string }) => l.id === photo.id
      );
      expect(replaced.focalX).toBe(20);
      expect(replaced.focalY).toBe(80);
      expect(replaced.width).toBe(photo.width);
      await page.keyboard.press("Control+d");
      const count = (await json()).layers.length;
      await picker.setInputFiles({
        name: "damaged.png",
        mimeType: "image/png",
        buffer: Buffer.from("broken picture"),
      });
      await expect(
        page.getByText("Unable to read image data", { exact: true })
      ).toBeVisible();
      expect((await json()).layers.length).toBe(count);
    }
  );
  await record(
    [224, 225, 226, 228, 229, 230, 231, 232, 233, 234, 237, 238],
    "Download live PNG, JPEG and PDF with uploaded images and accented text",
    async () => {
      for (const format of ["PNG", "JPEG", "PDF"]) {
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
        const download = await pending;
        await download.saveAs(
          test.info().outputPath(`invitation.${format.toLowerCase()}`)
        );
        expect(await download.failure()).toBeNull();
      }
    }
  );
  await record(
    [9, 10, 253, 254, 256, 266, 267, 268],
    "Responsive controls and export dialog on phone, tablet and desktop",
    async () => {
      for (const [width, height] of [
        [390, 844],
        [768, 1024],
        [1280, 720],
        [1920, 1080],
      ]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(250);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
          )
        ).toBe(true);
        const undo = await page
          .getByRole("button", { name: "Undo", exact: true })
          .boundingBox();
        expect(undo!.x).toBeGreaterThanOrEqual(0);
        expect(undo!.y + undo!.height).toBeLessThanOrEqual(height);
        await page.getByRole("button", { name: "Export", exact: true }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await page.screenshot({
          path: test.info().outputPath(`studio-${width}.png`),
        });
      }
    }
  );
  await page.keyboard.press("Control+d");
  await page
    .locator('input[type="file"][accept="application/json,.json"]')
    .first()
    .setInputFiles({
      name: "house.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(houseTemplate)),
    });
  await saved();
  if (await page.getByRole("button", { name: "Dismiss", exact: true }).count())
    await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  for (const [width, height] of [
    [1440, 950],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    await page.screenshot({
      path: test.info().outputPath(`studio-clean-${width}.png`),
    });
  }
  await saved();
  mkdirSync(test.info().outputDir, { recursive: true });
  writeFileSync(
    path.join(test.info().outputDir, "checklist-evidence.json"),
    JSON.stringify(evidence, null, 2)
  );
});
