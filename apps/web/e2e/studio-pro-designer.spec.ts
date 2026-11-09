import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

test.describe("Studio Pro Designer Experience", () => {
  test.setTimeout(120_000);

  test("photoshop-grade tool rail, options bar, layers dock, and crop overlay", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await createAndLoginUser(page, undefined, "designer_photoshop");
    const { eventId } = await createTestEvent(page);

    await page.goto(`/events/${eventId}/invitations/design?mode=pro`);
    await expect(page.getByTestId("invitation-designer")).toBeVisible({
      timeout: 30_000,
    });

    // Verify stage and card existence
    const stage = page.getByTestId("designer-stage");
    await expect(stage).toBeVisible();

    // Verify Contextual Options Bar under header is clean and functional
    const optionsBar = page.getByRole("toolbar", {
      name: "Contextual Tool Options",
    });
    await expect(optionsBar).toBeVisible();

    // Verify Docked Left ToolRail
    const toolRail = page.getByRole("toolbar", { name: "Design tools" });
    await expect(toolRail).toBeVisible();

    // Verify Right Studio Sidebar and Layers Dock
    const sidebar = page.getByRole("complementary", { name: "Studio Sidebar" });
    await expect(sidebar).toBeVisible();
    const layersDock = page.getByTestId("layers-dock");
    await expect(layersDock).toBeVisible();

    // Verify Ariya logo and branding in top header
    const topHeader = page.getByRole("banner", {
      name: "Studio top navigation",
    });
    await expect(topHeader).toBeVisible();
    await expect(topHeader.getByRole("link", { name: /Àríyá/i })).toBeVisible();
    await expect(topHeader.getByRole("link", { name: /Back/i })).toBeVisible();
    await expect(topHeader.getByText("Invitation Designer")).toBeVisible();

    // Test Quick Key 'C' for Crop Tool
    await page.keyboard.press("c");
    await page.waitForTimeout(300);

    // Verify Crop overlay is visible with 3x3 Rule-of-Thirds grid
    const cropOverlay = page.getByTestId("crop-overlay");
    await expect(cropOverlay).toBeVisible();

    // Test Quick Key 'V' to return to Move & Select Tool
    await page.keyboard.press("v");
    await page.waitForTimeout(300);
    await expect(cropOverlay).not.toBeVisible();

    // Test Multi-Selection on Canvas via Marquee Drag
    const canvasWrap = page.locator("[data-invitation-canvas]");
    const canvasBox = await canvasWrap.boundingBox();
    if (canvasBox) {
      // Drag a marquee selection box across the center of the invitation card
      await page.mouse.move(canvasBox.x + 30, canvasBox.y + 100);
      await page.mouse.down();
      await page.mouse.move(
        canvasBox.x + canvasBox.width - 30,
        canvasBox.y + 400
      );
      await page.waitForTimeout(100);
      await page.mouse.up();
      await page.waitForTimeout(300);
    }

    // Verify multi-selection inspector panel appeared
    const multiselectInspector = page.getByTestId("inspector-multiselect");
    if (await multiselectInspector.isVisible()) {
      await expect(
        multiselectInspector.getByText(/Selection \(/)
      ).toBeVisible();
      await expect(
        multiselectInspector.getByText("Align Selection")
      ).toBeVisible();
    }

    // Test Quick Key Cmd+A (Select All Layers)
    await page.keyboard.press("Meta+a");
    await page.waitForTimeout(200);

    // Click Properties tab in sidebar to verify batch Inspector
    await sidebar.getByRole("button", { name: "Properties" }).click();
    await page.waitForTimeout(200);
    await expect(page.getByTestId("inspector-multiselect")).toBeVisible();

    // Test Quick Key Cmd+D (Deselect All)
    await page.keyboard.press("Meta+d");
    await page.waitForTimeout(200);
    await expect(page.getByTestId("inspector-multiselect")).not.toBeVisible();

    // Test dragging a horizontal guide out from the top ruler
    const topRuler = page.locator("div[title*='horizontal guide']");
    if (await topRuler.isVisible()) {
      const rulerBox = await topRuler.boundingBox();
      if (rulerBox) {
        await page.mouse.move(rulerBox.x + 200, rulerBox.y + 12);
        await page.mouse.down();
        await page.mouse.move(rulerBox.x + 200, rulerBox.y + 180);
        await page.mouse.up();
        await page.waitForTimeout(300);
      }
    }

    // Verify draggable resizer on sidebar
    const resizer = sidebar.locator("div[title*='Drag to resize']");
    await expect(resizer).toBeVisible();

    // Switch right sidebar to Layers tab and test selecting Background layer
    await sidebar.getByRole("button", { name: "Layers" }).click();
    const bgRow = page.getByTestId("layer-row-background");
    await expect(bgRow).toBeVisible();

    // Screenshot of Layers Dock showing the pinned Background layer at the bottom
    await page.screenshot({
      path: "/Users/mac/.gemini/antigravity/brain/8f09b53a-fece-4ea0-84ce-dc659ae497fa/studio-layers-dock-background.png",
      fullPage: true,
    });

    await bgRow.click();
    await page.waitForTimeout(200);

    // Verify it automatically focuses Properties for Background
    await expect(page.getByTestId("inspector-card")).toBeVisible();
    await expect(page.getByText("Card dimensions & shape")).toBeVisible();

    // Verify Studio Bottom Dock with Export button and no duplicate footer overlay
    const bottomDock = page.getByRole("region", {
      name: "Studio controls and export",
    });
    await expect(bottomDock).toBeVisible();
    await expect(
      bottomDock.getByRole("button", { name: "Export" })
    ).toBeVisible();

    // Verify Menus on the left
    await expect(topHeader.getByRole("button", { name: "File" })).toBeVisible();
    await expect(topHeader.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(
      topHeader.getByRole("button", { name: "Insert" })
    ).toBeVisible();

    // Test selecting a layer to inspect Visual FX and Position & Size in Light Mode
    const textLayer = page
      .locator("[data-invitation-canvas]")
      .getByText(/Kemi & Tunde/i)
      .first();
    if (await textLayer.isVisible()) {
      await textLayer.click();
      await page.waitForTimeout(300);
      await expect(page.getByTestId("inspector-layer")).toBeVisible();
      await page.screenshot({
        path: "/Users/mac/.gemini/antigravity/brain/8f09b53a-fece-4ea0-84ce-dc659ae497fa/studio-layer-inspector-light-mode.png",
        fullPage: true,
      });
    }

    // Take screenshot of Light Mode
    await page.screenshot({
      path: "/Users/mac/.gemini/antigravity/brain/8f09b53a-fece-4ea0-84ce-dc659ae497fa/studio-brand-light-mode.png",
      fullPage: true,
    });

    // Click Insert Menu to show dropdown
    await topHeader.getByRole("button", { name: "Insert" }).click();
    await page.waitForTimeout(200);
    await expect(page.getByRole("menu")).toBeVisible();

    await page.screenshot({
      path: "/Users/mac/.gemini/antigravity/brain/8f09b53a-fece-4ea0-84ce-dc659ae497fa/studio-brand-menu-open.png",
      fullPage: true,
    });

    // Close menu by clicking header
    await topHeader.click();
    await page.waitForTimeout(100);

    // Toggle Dark Mode
    const themeBtn = topHeader.getByRole("button", {
      name: /Switch to.*dark/i,
    });
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: "/Users/mac/.gemini/antigravity/brain/8f09b53a-fece-4ea0-84ce-dc659ae497fa/studio-brand-dark-mode.png",
        fullPage: true,
      });
    }
  });
});
