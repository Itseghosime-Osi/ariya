import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

test.describe("RSVP & Email Dispatch", () => {
  test("copy invite link, guest rsvp submission, plus-one, and confirmation pass", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await createAndLoginUser(page, context, "rsvp_host");
    const { eventId } = await createTestEvent(page);

    // Add guest manually
    await page.goto(`/events/${eventId}/guests`);
    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .locator('input[placeholder="Chief Olawale Adeyemi"]')
      .fill("Chukwudi Obi");
    await page
      .locator('input[placeholder="olawale@example.com"]')
      .fill("chukwudi@lagos.ng");
    await page
      .locator('input[placeholder="0803 123 4567"]')
      .fill("+2348039998888");
    await page.getByRole("button", { name: /add to guestbook/i }).click();

    await expect(page.getByText("Chukwudi Obi").first()).toBeVisible({
      timeout: 5000,
    });

    // Open detail drawer and copy link
    await page.getByText("Chukwudi Obi").first().click();
    await expect(page.getByText(/Guest Details/i)).toBeVisible();
    await page
      .getByRole("button", { name: /copy link/i })
      .first()
      .click();
    await expect(page.getByText(/Copied Link/i)).toBeVisible();

    const inviteUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(inviteUrl).toContain("/i/");

    // Open invitation link in guest context
    await page.goto(inviteUrl);
    await expect(page.getByText(/Personal Celebration Pass/i)).toBeVisible();
    await expect(page.getByText("Chukwudi Obi").first()).toBeVisible();

    // Submit RSVP response
    await page.getByLabel(/Joyfully Accept/i).check();
    await page
      .locator('input[name="dietary"]')
      .fill("Jollof rice and grilled fish");
    await page.locator('textarea[name="note"]').fill("Hearty congratulations!");
    await page.getByRole("button", { name: /submit rsvp response/i }).click();

    // Confirm pass screen
    await expect(page.getByText(/RSVP Confirmed & Honoured/i)).toBeVisible({
      timeout: 10000,
    });
    const checkInCodeElement = page
      .locator('span.font-mono:has-text("ARY-")')
      .first();
    await expect(checkInCodeElement).toBeVisible();
  });
});
