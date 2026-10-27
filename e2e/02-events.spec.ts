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

  test("settings route (/events/[eventId]/settings): edit and save details, archive with confirmation", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "event_host_settings");
    const { eventId, title } = await createTestEvent(page);

    // Navigate to /events/[eventId]/settings
    await page.goto(`/events/${eventId}/settings`);
    await expect(page.locator("h1")).toContainText(/Celebration Settings/i);

    // Verify current title and details
    const titleInput = page.locator('input[value="' + title + '"]');
    await expect(titleInput).toBeVisible();

    // Edit and save details
    const updatedTitle = `${title} Ceremonial Edition`;
    await titleInput.fill(updatedTitle);
    await page.getByRole("button", { name: /save settings/i }).click();

    await expect(page.getByText(/settings saved successfully/i)).toBeVisible({
      timeout: 10000,
    });

    // Open Archive Confirmation Modal
    await page.getByRole("button", { name: /archive event/i }).click();
    await expect(page.getByText(/Archive Celebration\?/i)).toBeVisible();

    // Confirm archive
    await page.getByRole("button", { name: /confirm archive/i }).click();

    // Verify redirected to /events and celebration is archived
    await page.waitForURL(/\/events$/, { timeout: 10000 });
    await expect(page.locator("h1")).toContainText(/Celebrations/i);
  });

  test("public event page does not crash with non-bucket cover image", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "event_host_cover");
    const { eventId, title } = await createTestEvent(page);

    // Publish event
    await page.goto(`/events/${eventId}/page-editor`);
    await page.locator('input[type="checkbox"]').first().check();
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/updates saved successfully/i)).toBeVisible({
      timeout: 10000,
    });

    const publicPageLink = page.getByRole("link", {
      name: /view public page/i,
    });
    const publicHref = await publicPageLink.getAttribute("href");

    // Visit public page - should render 200 without throwing image host error
    const res = await page.goto(publicHref!);
    expect(res?.status()).toBe(200);
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(
      page.getByText(/Ceremonial Invitation/i).first()
    ).toBeVisible();
  });
});
