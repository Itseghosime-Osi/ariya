import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

test.describe("Reception Check-in Desk", () => {
  test("receptionist search, verify code, and admit guest", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await createAndLoginUser(page, context, "checkin_host");
    const { eventId } = await createTestEvent(page);

    // Add guest
    await page.goto(`/events/${eventId}/guests`);
    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .locator('input[placeholder="Chief Olawale Adeyemi"]')
      .fill("Kayode Fayemi");
    await page
      .locator('input[placeholder="olawale@example.com"]')
      .fill("kayode@fayemi.ng");
    await page
      .locator('input[placeholder="0803 123 4567"]')
      .fill("+2348039871122");
    await page.getByRole("button", { name: /add to guestbook/i }).click();
    await expect(page.getByText("Kayode Fayemi").first()).toBeVisible({
      timeout: 5000,
    });

    // Open drawer to copy RSVP link
    await page.getByText("Kayode Fayemi").first().click();
    await expect(page.getByText(/Guest Details/i)).toBeVisible();
    await page
      .getByRole("button", { name: /copy link/i })
      .first()
      .click();
    await expect(page.getByText(/Copied Link/i)).toBeVisible();
    const rsvpLink = await page.evaluate(() => navigator.clipboard.readText());
    await page.getByRole("button", { name: /close drawer/i }).click();

    // Guest completes RSVP to get check-in pass code
    await page.goto(rsvpLink);
    await expect(page.getByText(/Your guest pass/i)).toBeVisible();
    await page.getByLabel(/Joyfully Accept/i).check();
    await page.getByRole("button", { name: /submit rsvp response/i }).click();
    await expect(page.getByText(/RSVP Confirmed & Honoured/i)).toBeVisible({
      timeout: 10000,
    });

    const codeEl = page.locator('span.font-mono:has-text("ARY-")').first();
    await expect(codeEl).toBeVisible();
    const checkInCode = (await codeEl.textContent())?.trim();
    expect(checkInCode).toMatch(/^ARY-[A-Z0-9]+-[A-Z0-9]+$/);

    // Navigate to Check-in Desk
    await page.goto(`/events/${eventId}/check-in`);
    await expect(
      page.getByText(/Check-In Desk & Reception Concierge/i)
    ).toBeVisible();

    // Perform check-in via security code
    await page.locator('input[placeholder*="ARY-"]').fill(checkInCode!);
    await page.getByRole("button", { name: /admit guest/i }).click();

    // Verify Admission Approved
    await expect(page.getByText(/Admission Approved/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Kayode Fayemi").first()).toBeVisible();
    await expect(page.getByText(/Admitted Through Desk/i)).toBeVisible();
  });
});
