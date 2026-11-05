import { expect, test } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

test.describe("Archive", () => {
  test("an archived celebration leaves the list, waits in the profile archive, and can be restored or deleted for good", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await createAndLoginUser(page, context, "event_host_archive");
    const { eventId, title } = await createTestEvent(page);

    // Archive it from the event's settings.
    await page.goto(`/events/${eventId}/settings`);
    await page.getByRole("tab", { name: /danger zone/i }).click();
    await page.getByRole("button", { name: /archive event/i }).click();
    await page.getByRole("button", { name: /confirm archive/i }).click();
    await page.waitForURL(/\/events$/, { timeout: 15000 });

    // It is gone from your celebrations...
    await expect(page.getByText(title)).toHaveCount(0);

    // ...and waits in the archive, reached from the profile.
    await page.goto("/profile");
    await page.getByTestId("profile-archive-link").click();
    await page.waitForURL(/\/profile\/archive$/);
    await expect(
      page.getByRole("link", { name: new RegExp(title) })
    ).toBeVisible();

    // Restoring brings it back.
    await page.getByRole("button", { name: /restore/i }).click();
    await expect(page.getByText(/nothing in the archive/i)).toBeVisible();
    await page.goto("/events");
    await expect(page.getByText(title).first()).toBeVisible();

    // Archive again, then delete for good: the name must be typed exactly.
    await page.goto(`/events/${eventId}/settings`);
    await page.getByRole("tab", { name: /danger zone/i }).click();
    await page.getByRole("button", { name: /archive event/i }).click();
    await page.getByRole("button", { name: /confirm archive/i }).click();
    await page.waitForURL(/\/events$/, { timeout: 15000 });

    await page.goto("/profile/archive");
    await page.getByRole("button", { name: /delete forever/i }).click();
    const confirm = page.getByRole("button", { name: /^delete forever$/i });
    await expect(confirm).toBeDisabled();
    await page.locator("#delete-confirm-name").fill(title.slice(0, -1));
    await page.getByRole("checkbox").check();
    await expect(confirm).toBeDisabled();
    await page.locator("#delete-confirm-name").fill(title);
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page.getByText(/nothing in the archive/i)).toBeVisible();
  });
});
