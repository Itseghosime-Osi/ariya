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
    await expect(page.getByText(/Your guest pass/i)).toBeVisible();
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

    // Designer preview shows the custom headline
    await expect(
      page.locator("h2").filter({ hasText: customHeadline }).first()
    ).toBeVisible();

    // Visit guest invitation link and confirm custom text and emerald theme styling appear
    await page.goto(inviteUrl);
    await expect(page.getByText(customHeadline).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(customSubheadline).first()).toBeVisible();
    await expect(page.getByText(customMessage).first()).toBeVisible();

    // Monogram seal and headline reflect emerald theme
    await expect(page.locator("header div.rounded-xl").first()).toHaveClass(
      /bg-emerald-900/
    );
    await expect(
      page.getByRole("heading", { name: customHeadline })
    ).toHaveClass(/text-emerald-950/);

    // Submit RSVP and verify emerald styling on the accepted celebration pass
    await page.getByRole("button", { name: /submit rsvp response/i }).click();
    await expect(page.getByText(/RSVP Confirmed & Honoured/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("heading", { level: 1 })).toHaveClass(
      /text-emerald-950/
    );
  });

  test("one-person party can accept, decline, and accept again on the same page without count error", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await createAndLoginUser(page, context, "rsvp_revision_host");
    const { eventId } = await createTestEvent(page);

    // Register a 1-person guest (no plus-ones)
    await page.goto(`/events/${eventId}/guests`);
    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .locator('input[placeholder="Chief Olawale Adeyemi"]')
      .fill("Kehinde Bankole");
    await page
      .locator('input[placeholder="olawale@example.com"]')
      .fill("kehinde@lagos.ng");
    await page.getByRole("button", { name: /add to guestbook/i }).click();
    await expect(page.getByText("Kehinde Bankole").first()).toBeVisible({
      timeout: 5000,
    });

    // Copy invite link
    await page.getByText("Kehinde Bankole").first().click();
    await page
      .getByRole("button", { name: /copy link/i })
      .first()
      .click();
    const inviteUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(inviteUrl).toContain("/i/");

    // 1. Initial Accept
    await page.goto(inviteUrl);
    await expect(page.getByText("Kehinde Bankole").first()).toBeVisible();
    await page.getByLabel(/Joyfully Accept/i).check();
    await page.getByRole("button", { name: /submit rsvp response/i }).click();
    await expect(page.getByText(/RSVP Confirmed & Honoured/i)).toBeVisible({
      timeout: 10000,
    });

    // 2. Revise to Decline
    await page.goto(`${inviteUrl}?revise=true`);
    await expect(page.getByText(/Revision Mode/i)).toBeVisible();
    await page.getByLabel(/Regretfully Decline/i).check();
    await page.getByRole("button", { name: /update rsvp response/i }).click();
    await expect(page.getByText(/Regrets Recorded/i)).toBeVisible({
      timeout: 10000,
    });

    // 3. Revise back to Accept (no count selector is visible for party of 1)
    await page.goto(`${inviteUrl}?revise=true`);
    await expect(page.getByText(/Revision Mode/i)).toBeVisible();
    await page.getByLabel(/Joyfully Accept/i).check();
    await expect(page.locator('select[name="attendingCount"]')).toHaveCount(0);
    await page.getByRole("button", { name: /update rsvp response/i }).click();

    // Verify it accepts cleanly without attendee count error
    await expect(page.getByText(/RSVP Confirmed & Honoured/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText(
        /The requested attendee count is not permitted for this party/i
      )
    ).toHaveCount(0);
  });
});
