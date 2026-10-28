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
    await expect(page.locator("h1")).toContainText(/Your events/i);
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
    await expect(page.getByText(/Invitation/i).first()).toBeVisible();
  });

  for (const tz of ["UTC", "America/New_York"] as const) {
    test(`page editor preserves exact WAT datetime across save and reload in ${tz} timezone`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ timezoneId: tz });
      const page = await context.newPage();

      try {
        await createAndLoginUser(
          page,
          context,
          `wat_tz_${tz.toLowerCase().replace(/[^a-z0-9]/g, "_")}`
        );
        const { eventId } = await createTestEvent(page);

        await page.goto(`/events/${eventId}/page-editor`);
        await expect(page.getByText(/Event Page Editor/i)).toBeVisible();

        // Enable public access so we can view /e/[slug]
        const isPublicCheckbox = page.locator('input[type="checkbox"]').first();
        if (!(await isPublicCheckbox.isChecked())) {
          await isPublicCheckbox.check();
        }

        // Fill Ceremony Date & Time with 14:00 WAT
        const ceremonyInput = page
          .locator('input[type="datetime-local"]')
          .first();
        await ceremonyInput.fill("2026-12-12T14:00");

        // Fill RSVP Deadline with 14:00 WAT
        const rsvpDeadlineInput = page
          .locator('input[type="datetime-local"]')
          .nth(1);
        await rsvpDeadlineInput.fill("2026-12-01T14:00");

        // Save changes
        await page.getByRole("button", { name: /save changes/i }).click();
        await expect(page.getByText(/updates saved successfully/i)).toBeVisible(
          {
            timeout: 10000,
          }
        );

        // Reload page and verify inputs preserve exact WAT values
        await page.reload();
        await expect(
          page.locator('input[type="datetime-local"]').first()
        ).toHaveValue("2026-12-12T14:00");
        await expect(
          page.locator('input[type="datetime-local"]').nth(1)
        ).toHaveValue("2026-12-01T14:00");

        // Verify public page displays 2:00 PM WAT
        const publicPageLink = page.getByRole("link", {
          name: /view public page/i,
        });
        const publicHref = await publicPageLink.getAttribute("href");
        await page.goto(publicHref!);
        await expect(page.getByText(/2:00 PM WAT/i).first()).toBeVisible({
          timeout: 10000,
        });
      } finally {
        await context.close();
      }
    });
  }

  test("page editor datetime-local keyboard segment entry updates preview to 2:00 PM WAT before saving", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "en-US" });
    const page = await context.newPage();
    try {
      await createAndLoginUser(page, context, "kbd_segment_user");
      const { eventId } = await createTestEvent(page);

      await page.goto(`/events/${eventId}/page-editor`);
      await expect(page.getByText(/Event Page Editor/i)).toBeVisible();

      const ceremonyInput = page
        .locator('input[type="datetime-local"]')
        .first();

      // Start with 15:00 (3:00 PM WAT). Refill until the preview reacts, so a
      // fill that lands before hydration doesn't count as the app failing.
      await expect(async () => {
        await ceremonyInput.fill("2026-12-12T15:00");
        await expect(page.getByText(/3:00 PM WAT/i).first()).toBeVisible({
          timeout: 1000,
        });
      }).toPass({ timeout: 15000 });

      // Clear input so segments start fresh: --/--/---- --:--
      await ceremonyInput.clear();

      // Click the field, type month, day, year, hour, minute, and select PM
      await ceremonyInput.click();
      await page.keyboard.type("121220260200p");

      // Assert that preview reflects 2:00 PM WAT before saving
      await expect(page.getByText(/2:00 PM WAT/i).first()).toBeVisible({
        timeout: 5000,
      });

      // Save changes
      await page.getByRole("button", { name: /save changes/i }).click();
      await expect(page.getByText(/updates saved successfully/i)).toBeVisible({
        timeout: 10000,
      });

      // Reload and assert value persisted
      await page.reload();
      await expect(
        page.locator('input[type="datetime-local"]').first()
      ).toHaveValue("2026-12-12T14:00");
    } finally {
      await context.close();
    }
  });
});
