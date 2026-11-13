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

    // The designer opens in Simple mode: plain questions, no layers.
    await page.getByRole("link", { name: /open the designer/i }).click();
    await expect(page.getByTestId("invitation-designer")).toBeVisible();

    // Select emerald_regal theme
    await page
      .getByRole("button", { name: /Emerald Regal/i })
      .first()
      .click();

    const customHeadline = "Joyful Union & Celebration";
    const customSubheadline = "Together with our families and honored guests";
    const customMessage =
      "We warmly welcome you to share this sacred milestone with us.";

    // Names, the line above them and the message are ordinary fields.
    await page.locator("#simple-names").fill(customHeadline);
    // The line above the names sits under "More words" (the rest of the words are folded away).
    await page.getByRole("button", { name: /More words/ }).click();
    await page.locator("#simple-kicker").fill(customSubheadline);
    await page.locator("#simple-message").fill(customMessage);

    // The designer saves itself once the typing settles.
    await expect(
      page.getByTestId("studio-top-header").getByRole("status")
    ).toHaveText(/^saved/, { timeout: 15000 });

    // Reload page to verify persistence
    await page.reload();
    await expect(page.getByTestId("invitation-card")).toContainText(
      customHeadline
    );

    // The overview desk shows the same saved card, not the house default.
    await page.goto(`/events/${eventId}`);
    const overviewCard = page.getByTestId("invitation-card").first();
    await expect(overviewCard).toContainText(customHeadline);
    await expect(overviewCard).toContainText(customMessage);

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
