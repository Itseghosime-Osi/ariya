import { test, expect, devices } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

/**
 * iPhone Safari zooms into any focused text field whose text is under 16px
 * and never zooms back out. A global rule in styles/globals.css gives every
 * text-entry field on a touch device 16px text; this walks real pages on an
 * emulated iPhone and fails if any visible field is smaller.
 */
async function undersizedFields(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const SKIP = new Set([
      "checkbox",
      "radio",
      "range",
      "file",
      "color",
      "button",
      "submit",
      "reset",
      "image",
      "hidden",
    ]);
    const fields = [
      ...document.querySelectorAll<HTMLInputElement>("input, textarea, select"),
    ].filter((el) => {
      if (el instanceof HTMLInputElement && SKIP.has(el.type)) return false;
      return (
        el.getClientRects().length > 0 &&
        getComputedStyle(el).visibility !== "hidden"
      );
    });
    return {
      checked: fields.length,
      small: fields
        .map((el) => ({
          field:
            el.getAttribute("aria-label") ||
            el.getAttribute("placeholder") ||
            el.getAttribute("name") ||
            el.tagName.toLowerCase(),
          size: parseFloat(getComputedStyle(el).fontSize),
        }))
        .filter((f) => f.size < 16),
    };
  });
}

test.describe("No zoom-on-focus on touch devices", () => {
  test("every text field is at least 16px on an iPhone", async ({
    browser,
  }) => {
    const context = await browser.newContext({ ...devices["iPhone 14"] });
    const page = await context.newPage();
    try {
      await createAndLoginUser(page, context, "no_zoom_user");
      const { eventId } = await createTestEvent(page);

      let checked = 0;
      const offenders: string[] = [];
      const scan = async (label: string) => {
        const result = await undersizedFields(page);
        checked += result.checked;
        for (const f of result.small) {
          offenders.push(`${label}: "${f.field}" is ${f.size}px`);
        }
      };

      for (const path of [
        "/events/new",
        `/events/${eventId}/guests`,
        `/events/${eventId}/settings`,
        `/events/${eventId}/page-editor`,
        `/events/${eventId}/reminders`,
      ]) {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await expect(page.locator("#main-content")).toBeVisible();
        await scan(path);
      }

      // The search that opens from the top bar.
      await page.goto("/events", { waitUntil: "domcontentloaded" });
      await page.getByTestId("mobile-search-trigger").click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await scan("global search");

      // Guard against a scan that finds nothing to check.
      expect(checked).toBeGreaterThan(5);
      expect(offenders).toEqual([]);
    } finally {
      await context.close();
    }
  });
});
