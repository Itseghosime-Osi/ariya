import { expect, test } from "@playwright/test";

test.describe("About page story", () => {
  test("seven chapters, a rail on a wide screen, and no music button in the header", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/about");
    for (const id of [
      "chapter-yes",
      "chapter-noise",
      "chapter-card",
      "chapter-reply",
      "chapter-seats",
      "chapter-door",
      "chapter-dance",
    ]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
    await expect(
      page.getByRole("navigation", { name: "Story chapters" })
    ).toBeVisible();
    await expect(page.locator(".head-music")).toHaveCount(0);
  });

  test("the door chapter says what the desk does", async ({ page }) => {
    await page.goto("/about");
    await expect(
      page.getByRole("heading", { level: 2, name: /No queue at the door/ })
    ).toHaveCount(1);
  });
});
