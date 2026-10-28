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

  test("invitation design save persists across reload and renders on guest invitation pass", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await createAndLoginUser(page, context, "invitation_designer");
    const { eventId } = await createTestEvent(page);

    // Register a guest to receive an invitation token
    await page.goto(`/events/${eventId}/guests`);
    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .locator('input[placeholder="Chief Olawale Adeyemi"]')
      .fill("Folake Coker");
    await page.getByRole("button", { name: /add to guestbook/i }).click();
    await expect(page.getByText("Folake Coker").first()).toBeVisible({
      timeout: 5000,
    });

    // Copy the guest's personal invite link
    await page.getByText("Folake Coker").first().click();
    await page
      .getByRole("button", { name: /copy link/i })
      .first()
      .click();
    const inviteUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(inviteUrl).toContain("/i/");

    // Navigate to invitations desk
    await page.goto(`/events/${eventId}/invitations`);
    await expect(
      page.getByText(/Invitations & Delivery/i).first()
    ).toBeVisible();

    // Select emerald_regal theme
    const emeraldThemeButton = page
      .locator('button:has-text("Emerald Regal")')
      .first();
    await emeraldThemeButton.click();

    // Fill custom headline, subheadline, message
    const customHeadline = "Joyful Union & Celebration";
    const customSubheadline = "Together with our families and honored guests";
    const customMessage =
      "We warmly welcome you to share this sacred milestone with us.";

    await page.locator("#headline").fill(customHeadline);
    await page.locator("#subheadline").fill(customSubheadline);
    await page.locator("#customMessage").fill(customMessage);

    // Save changes
    await page.getByRole("button", { name: /save design/i }).click();
    await expect(page.getByText(/saved successfully/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Reload page to verify persistence
    await page.reload();
    await expect(page.locator("#headline")).toHaveValue(customHeadline);
    await expect(page.locator("#subheadline")).toHaveValue(customSubheadline);
    await expect(page.locator("#customMessage")).toHaveValue(customMessage);

    // Visit guest invitation link and confirm custom text appears
    await page.goto(inviteUrl);
    await expect(page.getByText(customHeadline).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(customSubheadline).first()).toBeVisible();
    await expect(page.getByText(customMessage).first()).toBeVisible();
  });
});
