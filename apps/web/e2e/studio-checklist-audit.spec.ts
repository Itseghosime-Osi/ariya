import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

test.describe("Ariya Designer Functional Checklist Verification", () => {
  test.setTimeout(180_000);

  test("verifies corners, escape cancel, undo/redo, lock guard, flip, aspect lock, rulers/grid, pan toggle & 400% zoom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await createAndLoginUser(page, undefined, "checklist_audit");
    const { eventId } = await createTestEvent(page);

    await page.goto(`/events/${eventId}/invitations/design?mode=pro`);
    await expect(page.getByTestId("invitation-designer")).toBeVisible({
      timeout: 30_000,
    });

    const card = page.locator("[data-invitation-canvas]");
    await expect(card).toBeVisible();

    // DES-188 & DES-191: Rulers & Grid actually toggle canvas overlays
    const rulersCorner = page.getByTestId("canvas-rulers-corner");
    await expect(rulersCorner).toBeVisible();
    await page.getByRole("button", { name: "Rulers", exact: true }).click();
    await expect(rulersCorner).toBeHidden();
    await page.getByRole("button", { name: "Rulers", exact: true }).click();
    await expect(rulersCorner).toBeVisible();

    const gridOverlay = page.getByTestId("canvas-grid");
    await expect(gridOverlay).toBeHidden();
    await page.getByRole("button", { name: "Grid", exact: true }).click();
    await expect(gridOverlay).toBeVisible();
    await page.getByRole("button", { name: "Grid", exact: true }).click();
    await expect(gridOverlay).toBeHidden();

    // DES-262 / H-key pan toggle recovers back to select cleanly
    await page.keyboard.press("h");
    await expect(page.getByTestId("designer-stage")).toHaveClass(/cursor-grab/);
    await page.keyboard.press("h");
    await expect(page.getByTestId("designer-stage")).not.toHaveClass(
      /cursor-grab/
    );

    // DES-057–085: Draw rectangle -> radius drag -> Escape cancel -> real drag -> Undo/Redo -> Alt per-corner
    await page
      .getByRole("button", { name: "Vector Shapes & Geometry" })
      .click();
    await page
      .getByRole("menu", { name: "Shape presets" })
      .getByRole("menuitem", { name: "Rectangle" })
      .click();

    await expect(page.getByTestId("designer-selection")).toBeVisible();
    const radiusHandles = page.locator("[data-radius-handle]");
    await expect(radiusHandles).toHaveCount(4);

    // Read initial Linked radius in Inspector
    const cornerRadiusInput = page.getByLabel("Corner radius");
    const initialRadius = Number(await cornerRadiusInput.inputValue());

    // Drag TL radius handle inward and press Escape mid-drag (DES-083)
    const tlHandle = page.locator("[data-radius-handle='tl']");
    const tlBox = await tlHandle.boundingBox();
    expect(tlBox).not.toBeNull();
    if (tlBox) {
      await page.mouse.move(
        tlBox.x + tlBox.width / 2,
        tlBox.y + tlBox.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(tlBox.x + 35, tlBox.y + 35, { steps: 4 });
      await page.keyboard.press("Escape");
      await page.mouse.up();
    }
    // Original radius must return on Escape
    await expect(cornerRadiusInput).toHaveValue(String(initialRadius));

    // Drag TL radius handle inward and release cleanly (DES-060, DES-084, DES-085)
    const tlBox2 = await tlHandle.boundingBox();
    if (tlBox2) {
      await page.mouse.move(
        tlBox2.x + tlBox2.width / 2,
        tlBox2.y + tlBox2.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(tlBox2.x + 32, tlBox2.y + 32, { steps: 5 });
      await page.mouse.up();
    }
    const roundedVal = Number(await cornerRadiusInput.inputValue());
    expect(roundedVal).toBeGreaterThan(initialRadius);

    // Undo one radius drag restores exact initialRadius (DES-084)
    await page.keyboard.press("Meta+z");
    // On Linux/Playwright fallback Control+z
    if (Number(await cornerRadiusInput.inputValue()) !== initialRadius) {
      await page.keyboard.press("Control+z");
    }
    await expect(cornerRadiusInput).toHaveValue(String(initialRadius));

    // Redo restores the rounded radius (DES-085)
    await page.keyboard.press("Meta+Shift+z");
    if (Number(await cornerRadiusInput.inputValue()) === initialRadius) {
      await page.keyboard.press("Control+Shift+z");
    }
    await expect(cornerRadiusInput).toHaveValue(String(roundedVal));

    // Alt + drag TL corner updates ONLY radiusTL independently (DES-065)
    const tlBox3 = await tlHandle.boundingBox();
    if (tlBox3) {
      await page.mouse.move(
        tlBox3.x + tlBox3.width / 2,
        tlBox3.y + tlBox3.height / 2
      );
      await page.keyboard.down("Alt");
      await page.mouse.down();
      await page.mouse.move(tlBox3.x + 25, tlBox3.y + 25, { steps: 4 });
      await page.mouse.up();
      await page.keyboard.up("Alt");
    }
    await expect(page.getByLabel("Top Left")).toBeVisible();
    const topLeftVal = Number(await page.getByLabel("Top Left").inputValue());
    const topRightVal = Number(await page.getByLabel("Top Right").inputValue());
    expect(topLeftVal).toBeGreaterThan(topRightVal);

    // Round-trip through Rust WASM Align must preserve radiusTL!
    await page.getByRole("button", { name: "Align left" }).first().click();
    await expect(page.getByLabel("Top Left")).toHaveValue(String(topLeftVal));

    // DES-036 / DES-037 / DES-046 / DES-047: Aspect lock + Quick Rotate + Flip H/V
    const lockAspectBtn = page.getByRole("button", {
      name: "Lock aspect ratio",
    });
    await lockAspectBtn.click();
    await expect(lockAspectBtn).toHaveAttribute("aria-pressed", "true");
    const widthField = page.getByLabel("Width", { exact: true });
    const heightField = page.getByLabel("Height", { exact: true });
    const prevW = Number(await widthField.inputValue());
    const prevH = Number(await heightField.inputValue());
    await widthField.fill(String(Math.round(prevW * 1.5)));
    await widthField.blur();
    const nextH = Number(await heightField.inputValue());
    expect(nextH).toBeGreaterThan(prevH);

    await page
      .getByRole("button", { name: "Rotate 90 degrees clockwise" })
      .click();
    await expect(page.getByLabel("Turn")).toHaveValue("90");

    const flipH = page.getByRole("button", { name: "Flip horizontal" });
    await flipH.click();
    await expect(flipH).toHaveAttribute("aria-pressed", "true");

    // DES-023 / DES-080 / DES-169: Lock layer blocks edits
    const layersRows = page.locator("[data-testid^='layer-row-']");
    // The entry seal is pinned first, so pick the rectangle's own row.
    const rectRow = layersRows.filter({ hasText: /Rectangle/ }).first();
    await rectRow.getByRole("button", { name: /^Lock /i }).click();
    await expect(page.getByText(/This layer is locked/i)).toBeVisible();
    await expect(radiusHandles).toHaveCount(0);

    // Unlock restores radius handles
    await rectRow.getByRole("button", { name: /^Unlock /i }).click();
    await expect(radiusHandles).toHaveCount(4);

    // DES-072: 400% Zoom via Navigator Panel
    await page.getByRole("button", { name: "Navigator" }).first().click();
    await expect(page.getByTestId("navigator-panel")).toBeVisible();
    await page.getByRole("button", { name: "400%" }).click();
    await expect(page.getByLabel("Canvas zoom slider")).toHaveValue("4");
    await page.getByRole("button", { name: "25%" }).click();
    await expect(page.getByLabel("Canvas zoom slider")).toHaveValue("0.25");
  });
});
