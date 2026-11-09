import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";
import * as path from "path";

test.describe("Real User Interactive Card Design Session", () => {
  test.setTimeout(180_000);

  test("design a luxury nigerian wedding card in pro mode and record all tool flaws", async ({
    page,
  }) => {
    const issues: Array<{
      step: string;
      tool: string;
      problem: string;
      severity: "HIGH" | "MEDIUM" | "LOW";
    }> = [];
    const logIssue = (
      step: string,
      tool: string,
      problem: string,
      severity: "HIGH" | "MEDIUM" | "LOW" = "HIGH"
    ) => {
      issues.push({ step, tool, problem, severity });
      console.log(
        `[TOOL FLAW] [${severity}] Step ${step} (${tool}): ${problem}`
      );
    };

    const artifactDir =
      "/Users/mac/.gemini/antigravity/brain/8f09b53a-fece-4ea0-84ce-dc659ae497fa";

    await page.setViewportSize({ width: 1440, height: 900 });
    await createAndLoginUser(page, undefined, "designer_real_user");
    const { eventId } = await createTestEvent(page);

    await page.goto(`/events/${eventId}/invitations/design?mode=pro`);
    await expect(page.getByTestId("invitation-designer")).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForTimeout(1000);

    const card = page.locator("[data-invitation-canvas]");
    await expect(card).toBeVisible();

    // -------------------------------------------------------------
    // STEP 1: Background & Card Setup
    // -------------------------------------------------------------
    console.log("=== STEP 1: Background & Card Setup ===");
    // Switch background to Velvet
    const velvetRadio = page.getByRole("radio", { name: "Velvet" });
    if (await velvetRadio.isVisible()) {
      await velvetRadio.click();
      await page.waitForTimeout(400);
    } else {
      logIssue(
        "1",
        "Background Selector",
        "Velvet background option not clickable or missing",
        "HIGH"
      );
    }

    // Switch palette to Sunset Aso-Ebi
    const sunsetPalette = page
      .locator(
        "button:has-text('Sunset Aso-Ebi'), button[title*='Sunset'], button:has-text('Sunset')"
      )
      .first();
    if (await sunsetPalette.isVisible()) {
      await sunsetPalette.click();
      await page.waitForTimeout(400);
    } else {
      // Check preset cards
      const paletteBtns = page
        .locator("button")
        .filter({ has: page.locator("span.rounded-full") });
      if ((await paletteBtns.count()) > 1) {
        await paletteBtns.nth(1).click();
      }
    }

    await page.screenshot({
      path: path.join(artifactDir, "interactive-step1-background.png"),
      fullPage: true,
    });

    // -------------------------------------------------------------
    // STEP 2: Vector Shapes & Geometry Tool (ToolRail)
    // -------------------------------------------------------------
    console.log("=== STEP 2: Vector Shapes & Geometry Tool ===");
    const shapesTool = page.getByRole("button", {
      name: "Vector Shapes & Geometry",
    });
    if (await shapesTool.isVisible()) {
      await shapesTool.click();
      await page.waitForTimeout(400);

      // Check if flyout opened
      const rectOption = page
        .getByRole("button", { name: "Rectangle" })
        .first();
      if (await rectOption.isVisible()) {
        await rectOption.click();
        await page.waitForTimeout(300);
      } else {
        logIssue(
          "2",
          "Shapes Tool Flyout",
          "Clicking shapes tool did not keep flyout open or options not selectable",
          "MEDIUM"
        );
      }

      // Try drag-to-draw on the card
      const cardBox = await card.boundingBox();
      if (cardBox) {
        await page.mouse.move(cardBox.x + 80, cardBox.y + 80);
        await page.mouse.down();
        await page.mouse.move(cardBox.x + cardBox.width - 80, cardBox.y + 400, {
          steps: 8,
        });
        await page.mouse.up();
        await page.waitForTimeout(600);

        // Check if drawing box appeared or layer was created
        const selectionBox = page.getByTestId("designer-selection");
        if (!(await selectionBox.isVisible())) {
          logIssue(
            "2",
            "Drag to Draw Shape",
            "Shape bounding selection did not appear after mouse drag release",
            "HIGH"
          );
        } else {
          console.log("Shape created and selected!");
        }

        // Test Corner Radius Handles
        const radiusHandles = page.locator("[data-radius-handle]");
        const radiusCount = await radiusHandles.count();
        if (radiusCount < 4) {
          logIssue(
            "2",
            "Corner Radius Handles",
            `Expected 4 corner radius handles on rectangle, found ${radiusCount}`,
            "HIGH"
          );
        } else {
          // Drag the top-left radius handle inward
          const tlHandle = radiusHandles.first();
          const tlBox = await tlHandle.boundingBox();
          if (tlBox) {
            await page.mouse.move(tlBox.x + 2, tlBox.y + 2);
            await page.mouse.down();
            await page.mouse.move(tlBox.x + 40, tlBox.y + 40, { steps: 5 });
            await page.mouse.up();
            await page.waitForTimeout(400);
          }
        }
      }
    } else {
      logIssue(
        "2",
        "ToolRail",
        "Vector Shapes & Geometry button not found on ToolRail",
        "HIGH"
      );
    }

    await page.screenshot({
      path: path.join(artifactDir, "interactive-step2-shapes.png"),
      fullPage: true,
    });

    // -------------------------------------------------------------
    // STEP 3: Text Tool & Calligraphy
    // -------------------------------------------------------------
    console.log("=== STEP 3: Text Tool & Calligraphy ===");
    const textTool = page.getByRole("button", { name: "Type text" });
    if (await textTool.isVisible()) {
      await textTool.click();
      await page.waitForTimeout(300);

      const cardBox = await card.boundingBox();
      if (cardBox) {
        // Drag to draw a headline text box
        await page.mouse.move(cardBox.x + 60, cardBox.y + 120);
        await page.mouse.down();
        await page.mouse.move(cardBox.x + cardBox.width - 60, cardBox.y + 200, {
          steps: 5,
        });
        await page.mouse.up();
        await page.waitForTimeout(600);

        // Look for the Inspector text input
        const textInput = page.locator("#designer-text-input");
        if (await textInput.isVisible()) {
          await textInput.fill("Babatunde & Folashade");
          await page.waitForTimeout(300);

          // Change font to Calligraphy / Great Vibes
          const fontSelect = page
            .locator("select[aria-label*='Font'], select")
            .first();
          if (await fontSelect.isVisible()) {
            await fontSelect
              .selectOption({ label: "Great Vibes (Formal Calligraphy)" })
              .catch(async () => {
                await fontSelect.selectOption("script");
              });
            await page.waitForTimeout(300);
          } else {
            // Check contextual options bar font select
            const optFont = page
              .locator("select")
              .filter({ hasText: "Calligraphy" })
              .or(page.locator("select").first());
            if (await optFont.isVisible()) {
              await optFont.selectOption("script").catch(() => {});
            } else {
              logIssue(
                "3",
                "Typography",
                "Font family dropdown not accessible in properties or options bar",
                "MEDIUM"
              );
            }
          }
        } else {
          logIssue(
            "3",
            "Text Input",
            "Inspector #designer-text-input not visible when text tool drew layer",
            "HIGH"
          );
        }
      }
    }

    await page.screenshot({
      path: path.join(artifactDir, "interactive-step3-text.png"),
      fullPage: true,
    });

    // -------------------------------------------------------------
    // STEP 4: Color & Swatches Panel
    // -------------------------------------------------------------
    console.log("=== STEP 4: Color & Swatches Panel ===");
    const swatchesTab = page
      .getByRole("button", { name: "Color & Swatches" })
      .first();
    if (await swatchesTab.isVisible()) {
      await swatchesTab.click();
      await page.waitForTimeout(400);

      // Check if hex input or swatches appear
      const hexInput = page
        .locator(
          "#designer-hex-input, [data-testid='hex-color-input'], input[placeholder*='#'], input[aria-label*='hex' i]"
        )
        .first();
      if (await hexInput.isVisible()) {
        await hexInput.fill("#DFBA73");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(300);
      } else {
        logIssue(
          "4",
          "Color Swatches",
          "Hex code input not visible in Color & Swatches tab",
          "MEDIUM"
        );
      }

      // Check palette swatches in the grid
      const swatchDots = page.locator("button[title*='#'], [data-swatch]");
      if ((await swatchDots.count()) > 0) {
        await swatchDots.first().click();
        await page.waitForTimeout(200);
      }
    } else {
      logIssue(
        "4",
        "Sidebar Tabs",
        "Color & Swatches tab not found in top half of sidebar",
        "HIGH"
      );
    }

    await page.screenshot({
      path: path.join(artifactDir, "interactive-step4-swatches.png"),
      fullPage: true,
    });

    // -------------------------------------------------------------
    // STEP 5: Crop Tool Interaction
    // -------------------------------------------------------------
    console.log("=== STEP 5: Crop Tool Interaction ===");
    await page.keyboard.press("c");
    await page.waitForTimeout(400);

    const cropOverlay = page.getByTestId("crop-overlay");
    if (await cropOverlay.isVisible()) {
      // Test dragging a corner crop handle
      const nwHandle = page.locator("[data-crop-handle='nw']");
      if (await nwHandle.isVisible()) {
        const handleBox = await nwHandle.boundingBox();
        if (handleBox) {
          await page.mouse.move(handleBox.x + 2, handleBox.y + 2);
          await page.mouse.down();
          await page.mouse.move(handleBox.x + 30, handleBox.y + 30, {
            steps: 5,
          });
          await page.mouse.up();
          await page.waitForTimeout(400);
        }
      } else {
        logIssue(
          "5",
          "Crop Tool",
          "Crop handles (nw, se, etc.) not rendered on crop overlay",
          "HIGH"
        );
      }
      // Exit crop tool
      await page.keyboard.press("v");
      await page.waitForTimeout(300);
    } else {
      logIssue(
        "5",
        "Crop Tool",
        "Pressing 'C' did not activate crop overlay",
        "HIGH"
      );
    }

    await page.screenshot({
      path: path.join(artifactDir, "interactive-step5-crop.png"),
      fullPage: true,
    });

    // -------------------------------------------------------------
    // STEP 6: Layers Dock (Reorder, Visibility, Lock)
    // -------------------------------------------------------------
    console.log("=== STEP 6: Layers Dock ===");
    const layersTab = page.getByRole("button", { name: "Layers" }).first();
    if (await layersTab.isVisible()) {
      await layersTab.click();
      await page.waitForTimeout(300);

      // Verify layer rows
      const layerRows = page.locator("[data-testid^='layer-row-']");
      const count = await layerRows.count();
      console.log(`Found ${count} layers in Layers Dock`);
      if (count === 0) {
        logIssue(
          "6",
          "Layers Dock",
          "No layer rows rendered in Layers list",
          "HIGH"
        );
      } else {
        const firstRow = layerRows.first();
        // Test eye icon (hide/show)
        const eyeBtn = firstRow
          .getByRole("button", { name: /Hide|Show/i })
          .first();
        if (await eyeBtn.isVisible()) {
          await eyeBtn.click();
          await page.waitForTimeout(300);
          await eyeBtn.click(); // restore
          await page.waitForTimeout(200);
        } else {
          logIssue(
            "6",
            "Layers Dock",
            "Eye visibility toggle button missing on layer row",
            "MEDIUM"
          );
        }

        // Test lock icon
        const lockBtn = firstRow
          .getByRole("button", { name: /Lock|Unlock/i })
          .first();
        if (await lockBtn.isVisible()) {
          await lockBtn.click();
          await page.waitForTimeout(200);
          await lockBtn.click(); // unlock
          await page.waitForTimeout(200);
        } else {
          logIssue(
            "6",
            "Layers Dock",
            "Lock toggle button missing on layer row",
            "MEDIUM"
          );
        }
      }
    } else {
      logIssue(
        "6",
        "Sidebar Tabs",
        "Layers tab not found in bottom half of sidebar",
        "HIGH"
      );
    }

    await page.screenshot({
      path: path.join(artifactDir, "interactive-step6-layers.png"),
      fullPage: true,
    });

    // -------------------------------------------------------------
    // STEP 7: History & Navigator Panels
    // -------------------------------------------------------------
    console.log("=== STEP 7: History & Navigator Panels ===");
    const historyTab = page.getByRole("button", { name: "History" }).first();
    if (await historyTab.isVisible()) {
      await historyTab.click();
      await page.waitForTimeout(300);
      const historyList = page.getByTestId("history-panel");
      if (!(await historyList.isVisible())) {
        logIssue(
          "7",
          "History Panel",
          "History panel data-testid not visible when tab clicked",
          "MEDIUM"
        );
      }
    } else {
      logIssue(
        "7",
        "History Panel",
        "History tab missing in bottom half",
        "MEDIUM"
      );
    }

    const navTab = page.getByRole("button", { name: "Navigator" }).first();
    if (await navTab.isVisible()) {
      await navTab.click();
      await page.waitForTimeout(300);
      const navPanel = page.getByTestId("navigator-panel");
      if (!(await navPanel.isVisible())) {
        logIssue(
          "7",
          "Navigator Panel",
          "Navigator panel data-testid not visible when tab clicked",
          "MEDIUM"
        );
      }
    } else {
      logIssue(
        "7",
        "Navigator Panel",
        "Navigator tab missing in bottom half",
        "MEDIUM"
      );
    }

    await page.screenshot({
      path: path.join(artifactDir, "interactive-step7-history-navigator.png"),
      fullPage: true,
    });

    // -------------------------------------------------------------
    // STEP 8: Export Modal & Format Selection
    // -------------------------------------------------------------
    console.log("=== STEP 8: Export Modal ===");
    const exportBtn = page.getByRole("button", { name: "Export" }).first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(400);

      const modal = page.locator(
        "[role='dialog'][aria-label='Export invitation artwork']"
      );
      if (await modal.isVisible()) {
        // Select PNG
        const pngBtn = page.getByRole("button", {
          name: /High-Resolution PNG/i,
        });
        if (await pngBtn.isVisible()) {
          await pngBtn.click();
          await page.waitForTimeout(200);
        }

        // Select JPEG
        const jpegBtn = page.getByRole("button", { name: /Compressed JPEG/i });
        if (await jpegBtn.isVisible()) {
          await jpegBtn.click();
          await page.waitForTimeout(200);
        }

        // Close modal
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      } else {
        logIssue(
          "8",
          "Export Modal",
          "Export button did not open Export modal dialog",
          "HIGH"
        );
      }
    }

    await page.screenshot({
      path: path.join(artifactDir, "interactive-step8-export.png"),
      fullPage: true,
    });

    console.log(
      "\n================ REAL USER TOOL FLAW REPORT ================\n"
    );
    console.table(issues);
  });
});
