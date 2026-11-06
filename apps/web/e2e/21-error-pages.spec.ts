import { test, expect } from "@playwright/test";
import { createAndLoginUser } from "./fixtures/test-helpers";

test.describe("Error and 404 pages", () => {
  test("an address that matches no page gets the styled 404 with a way home", async ({
    page,
  }) => {
    const res = await page.goto("/definitely-not-a-page");
    expect(res?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: /wandered off/i })
    ).toBeVisible();
    await expect(page.getByText("404")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /back to àríyá/i })
    ).toHaveAttribute("href", "/");
  });

  test("a bad invitation link and an unpublished event say so plainly", async ({
    page,
  }) => {
    await page.goto("/i/not-a-real-token-123456");
    await expect(
      page.getByRole("heading", { name: /invitation link not recognised/i })
    ).toBeVisible();

    await page.goto("/e/no-such-celebration");
    await expect(
      page.getByRole("heading", { name: /celebration unavailable/i })
    ).toBeVisible();
  });

  test("a celebration the host cannot open shows the in-app 404 inside the workspace", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "err_pages_host");
    await page.goto("/events/00000000-0000-4000-8000-000000000000");
    await expect(
      page.getByRole("heading", { name: /can't find that celebration/i })
    ).toBeVisible();
    // The app's own navigation is still around it.
    await expect(
      page.getByRole("link", { name: /return to my celebrations/i })
    ).toBeVisible();
  });
});
