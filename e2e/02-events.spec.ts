import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

test.describe("Events Creation & Overview", () => {
  test("create event wizard, desk metrics, milestones, and public page publishing", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "event_host");

    // Create event via wizard
    const { eventId, title } = await createTestEvent(page);

    // Verify on overview desk
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(page.getByText(/Celebration Desk/i).first()).toBeVisible();
    await expect(page.getByText(/Every yes, together/i).first()).toBeVisible();

    // Verify public page unpublished initially
    await page.goto(`/events/${eventId}/page-editor`);
    await expect(page.getByText(/Event Page Editor/i)).toBeVisible();

    const publicPageLink = page.getByRole("link", {
      name: /view public page/i,
    });
    const publicHref = await publicPageLink.getAttribute("href");
    expect(publicHref).toContain("/e/");

    await page.goto(publicHref!);
    await expect(page.getByText(/Celebration Unavailable/i)).toBeVisible();

    // Enable public discovery in Page Editor
    await page.goto(`/events/${eventId}/page-editor`);
    const isPublicCheckbox = page.locator('input[type="checkbox"]').first();
    await isPublicCheckbox.check();
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/updates saved successfully/i)).toBeVisible({
      timeout: 10000,
    });

    // Public page now renders
    await page.goto(publicHref!);
    await expect(page.getByText(title).first()).toBeVisible();
  });
});
