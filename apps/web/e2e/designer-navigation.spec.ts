import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

/** Leaving the designer while a save is still in flight, and fonts that never arrive. */
test("an in-flight save survives navigating away; blocked fonts fall back and still export", async ({
  page,
}) => {
  test.setTimeout(300000);
  page.setDefaultTimeout(20000);
  await createAndLoginUser(page, undefined, "studio_navigation");
  const { eventId } = await createTestEvent(page, {
    title: "Navigation during save",
    couple: "Ada & Kunle",
  });
  const designUrl = `/events/${eventId}/invitations/design?mode=pro`;
  await page.goto(designUrl);
  const names = page
    .getByTestId("designer-stage")
    .locator('[data-invitation-canvas] [data-layer-id="names"]');
  await expect(names).toBeVisible();

  // DES-216: slow the save down, edit, and leave the page straight away through the Back link.
  await page.route("**/invitations/design**", async (route) => {
    if (route.request().method() === "POST")
      await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.continue();
  });
  await page
    .getByTestId("layer-row-names")
    .locator("[data-layer-select]")
    .click();
  const words = "Saved while leaving";
  await page.getByRole("textbox", { name: "Text", exact: true }).fill(words);
  await page.getByRole("link", { name: "Back to invitations" }).click();
  await page.waitForURL(new RegExp(`/events/${eventId}/invitations$`));
  // Give the delayed save time to land, then open the designer again from the server.
  await page.waitForTimeout(6000);
  await page.unroute("**/invitations/design**");
  await page.goto(designUrl);
  await expect(names).toHaveText(words, { timeout: 20000 });

  // DES-119: no web font ever loads. The card must still draw its words and export.
  await page.route(/\.(woff2?|ttf|otf)(\?.*)?$/, (route) => route.abort());
  await page.goto(designUrl);
  await expect(names).toBeVisible();
  const family = await names.evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toMatch(/serif|Georgia|system-ui|sans-serif/i);
  const box = (await names.boundingBox())!;
  expect(box.width).toBeGreaterThan(50);
  expect(box.height).toBeGreaterThan(10);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("button")
    .filter({ hasText: "High-Resolution PNG" })
    .click();
  const pending = page.waitForEvent("download", { timeout: 60000 });
  await page.getByRole("button", { name: "Download PNG", exact: true }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toMatch(/\.png$/);
  console.log("NAVIGATION", JSON.stringify({ family, box }));
});
