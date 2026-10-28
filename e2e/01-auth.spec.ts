import { test, expect } from "@playwright/test";
import { createAndLoginUser } from "./fixtures/test-helpers";

test.describe("Authentication & Session", () => {
  test("sign up, validation, sign in, and authenticated redirect", async ({
    page,
    context,
  }) => {
    // 1. Visit sign up
    await page.goto("/sign-up");
    await expect(page).toHaveTitle(/(Sign Up|Create Account) • Àríyá/i);

    // 2. Validation: passwords mismatch
    await page.locator("#fullName").fill("Adeola Bakare");
    await page.locator("#emailInput").fill("mismatch@owambe.ng");
    await page.locator("#password").fill("Password123!");
    await page.locator("#confirmPassword").fill("Password456!");
    await page
      .getByRole("button", { name: /create celebration account/i })
      .click();
    await expect(page.getByText(/passcodes do not match/i)).toBeVisible();

    // 3. Complete valid registration & login via helper
    await createAndLoginUser(page, context, "auth_user");
    await expect(page).toHaveURL(/\/events/);
    await expect(
      page
        .getByText(/Your events|Plan your first celebration|Your Celebrations/i)
        .first()
    ).toBeVisible();

    // 4. Sign out
    await page.goto("/events");
    const profileLink = page.getByTitle(/profile & settings/i);
    if (await profileLink.isVisible()) {
      await profileLink.click();
    }
  });
});
