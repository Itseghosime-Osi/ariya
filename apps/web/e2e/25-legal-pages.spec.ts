import { expect, test } from "@playwright/test";

test.describe("Privacy and terms", () => {
  test("both pages open without signing in", async ({ page }) => {
    await page.goto("/privacy");
    await expect(
      page.getByRole("heading", { level: 1, name: "Privacy Policy" })
    ).toBeVisible();
    await expect(page.getByText(/Nigeria Data Protection Act/i)).toBeVisible();

    await page.goto("/terms");
    await expect(
      page.getByRole("heading", { level: 1, name: "Terms of Service" })
    ).toBeVisible();
    await expect(page.getByText(/Last updated/i)).toBeVisible();
  });

  test("the sign-up page links to them", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(
      page.getByRole("link", { name: "Terms", exact: true })
    ).toHaveAttribute("href", "/terms");
    await expect(
      page.getByRole("link", { name: "Privacy", exact: true })
    ).toHaveAttribute("href", "/privacy");
  });
});
