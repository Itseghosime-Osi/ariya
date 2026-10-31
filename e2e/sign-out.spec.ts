import { expect, test } from "@playwright/test";
import { createAndLoginUser } from "./fixtures/test-helpers";

test.describe("Sign-out confirmation", () => {
  test("close and stay keep the session; confirming signs out to sign-in", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "signout_owner");
    await page.goto("/events");

    const sidebarSignOut = page
      .getByTestId("desktop-sidebar")
      .getByRole("button", { name: "Sign out" });

    await sidebarSignOut.click();
    const dialog = page.getByRole("dialog", { name: /sign out of àríyá/i });
    await expect(dialog).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("div[data-state].fixed.inset-0")).toHaveCount(0);
    await expect(page).toHaveURL(/\/events/);

    await sidebarSignOut.click();
    await page.getByRole("button", { name: "Stay signed in" }).hover();
    await expect(page.getByTestId("sign-out-mood")).toHaveText(
      "Hooray! The celebration continues."
    );
    await page.getByRole("button", { name: "Stay signed in" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("div[data-state].fixed.inset-0")).toHaveCount(0);
    await expect(page.getByTestId("sign-out-stay-toast")).toBeVisible();
    await expect(page).toHaveURL(/\/events/);

    await page.getByTestId("user-avatar-menu").click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();
    await page.getByTestId("confirm-sign-out").hover();
    await expect(page.getByTestId("sign-out-mood")).toHaveText(
      "We'll save your place for next time."
    );
    await page.getByTestId("confirm-sign-out").click();
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10000 });
  });
});
