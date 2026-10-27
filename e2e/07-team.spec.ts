import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

test.describe("Team & Roles", () => {
  test("owner invites staff collaborator, staff accepts, and staff is blocked from billing", async ({
    page,
    context,
    browser,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await createAndLoginUser(page, context, "team_owner");
    const { eventId, title } = await createTestEvent(page);

    // Navigate to Team
    await page.goto(`/events/${eventId}/team`);
    await expect(page.getByText(/Team & Collaboration Roles/i)).toBeVisible();

    // Invite new staff member
    const timestamp = Date.now();
    const staffEmail = `staff_${timestamp}@owambe.ng`;
    await page.getByRole("button", { name: /invite member/i }).click();
    await page.locator('input[name="email"]').fill(staffEmail);
    await page.locator('select[name="role"]').selectOption("staff");
    await page.getByRole("button", { name: /send team invite/i }).click();

    await expect(page.getByText(staffEmail).first()).toBeVisible({
      timeout: 5000,
    });
    await page
      .getByRole("button", { name: /copy invite link/i })
      .first()
      .click();
    const inviteLink = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    expect(inviteLink).toContain("/invite/");

    // Staff context
    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();

    // Staff registers with matching email
    await staffPage.goto("/sign-up");
    await staffPage.locator("#fullName").fill("Staff Concierge");
    await staffPage.locator("#emailInput").fill(staffEmail);
    await staffPage.locator("#password").fill("Celebration2026!");
    await staffPage.locator("#confirmPassword").fill("Celebration2026!");
    await staffPage
      .getByRole("button", { name: /create celebration account/i })
      .click();
    await staffPage.waitForURL(/\/(events|sign-in)/, { timeout: 15000 });

    if (staffPage.url().includes("/sign-in")) {
      await staffPage.locator("#email").fill(staffEmail);
      await staffPage.locator("#password").fill("Celebration2026!");
      await staffPage.getByRole("button", { name: /sign in/i }).click();
      await staffPage.waitForURL(/\/events/, { timeout: 15000 });
    }

    // Accept invite via link
    await staffPage.goto(inviteLink);
    await expect(staffPage.getByText(title).first()).toBeVisible();
    await staffPage
      .getByRole("button", { name: /accept & join team/i })
      .click();
    await staffPage.waitForURL(new RegExp(`/events/${eventId}`), {
      timeout: 10000,
    });

    // Verify staff cannot access billing (RLS restricted)
    await staffPage.goto(`/events/${eventId}/billing`);
    await expect(staffPage.getByText(/Billing Access Restricted/i)).toBeVisible(
      { timeout: 10000 }
    );

    await staffContext.close();
  });
});
