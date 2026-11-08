import { expect, test } from "@playwright/test";

test.describe("Pricing", () => {
  test("states the price, the free limit and that there is no subscription", async ({
    page,
  }) => {
    await page.goto("/pricing");
    await expect(
      page.getByRole("heading", { level: 1, name: /Pay per event/ })
    ).toBeVisible();
    await expect(page.getByText("₦50,000").first()).toBeVisible();
    await expect(page.getByText(/Up to 20 guest invitations/)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /What the pass/ })
    ).toBeVisible();
  });

  test("the FAQ is honest about WhatsApp and text", async ({ page }) => {
    await page.goto("/pricing");
    await page
      .getByText("Do you send WhatsApp messages or texts for me?")
      .click();
    await expect(page.getByText(/Not yet\. Email invitations/)).toBeVisible();
  });
});
