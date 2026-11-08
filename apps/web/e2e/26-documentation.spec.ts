import { expect, test } from "@playwright/test";

test.describe("Documentation", () => {
  test("the manual opens without signing in and every section is listed", async ({
    page,
  }) => {
    await page.goto("/documentation");
    await expect(
      page.getByRole("heading", { level: 1, name: "The Àríyá manual" })
    ).toBeVisible();
    for (const name of [
      "Start here",
      "Host guide",
      "Engineering",
      "Reference",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
  });

  test("a page shows its contents and moves to the next page", async ({
    page,
  }) => {
    await page.goto("/documentation/billing");
    await expect(
      page.getByRole("heading", { level: 1, name: /Billing/ })
    ).toBeVisible();
    await expect(page.getByText("₦50,000").first()).toBeVisible();
    await page
      .getByRole("navigation", { name: "Previous and next" })
      .getByRole("link", { name: /Next/ })
      .click();
    await expect(page).toHaveURL(/\/documentation\/security$/);
  });

  test("search finds a page", async ({ page }) => {
    await page.goto("/documentation");
    await page
      .getByRole("searchbox", { name: "Search the manual" })
      .fill("webhook");
    await expect(
      page
        .getByRole("search")
        .getByRole("link", { name: /Billing and the Celebration Pass/ })
    ).toBeVisible();
  });

  test("the old /docs address lands on the manual", async ({ page }) => {
    await page.goto("/docs");
    await expect(page).toHaveURL(/\/documentation$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "The Àríyá manual" })
    ).toBeVisible();
  });

  test("the site header's Docs link opens the manual", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/pricing");
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Docs" })
      .click();
    await expect(page).toHaveURL(/\/documentation$/);
  });

  test("an unknown page is a 404", async ({ page }) => {
    const res = await page.goto("/documentation/does-not-exist");
    expect(res?.status()).toBe(404);
  });
});
