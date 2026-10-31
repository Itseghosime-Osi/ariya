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

    // 2. Move through the short setup steps and reject mismatched passcodes.
    await page.locator("#fullName").fill("Adeola Bakare");
    await page.getByTestId("signup-continue").click();
    await expect(
      page.getByRole("heading", { name: /where can we reach you/i })
    ).toBeVisible();
    await page.locator("#emailInput").fill("mismatch@owambe.ng");
    await page.getByTestId("signup-continue").click();
    await page.locator("#password").fill("Password123!");
    await page.locator("#confirmPassword").fill("Password456!");
    await page.getByTestId("signup-submit").click();
    await expect(page.getByText(/passcodes do not match/i)).toBeVisible();

    // 3. Complete valid registration & login via helper
    await createAndLoginUser(page, context, "auth_user");
    await expect(page).toHaveURL(/\/events/);
    await expect(
      page
        .getByText(/Your events|Plan your first celebration|Your Celebrations/i)
        .first()
    ).toBeVisible();
  });
});
