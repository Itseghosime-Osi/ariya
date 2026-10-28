import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

test.describe("Seating Chart & Capacity Conflict", () => {
  test("create tables, keyboard accessible assignment, capacity limits, and party size conflict unseating", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await createAndLoginUser(page, context, "seating_host");
    const { eventId } = await createTestEvent(page);

    // Add guest
    await page.goto(`/events/${eventId}/guests`);
    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .locator('input[placeholder="Chief Olawale Adeyemi"]')
      .fill("Eniola Adeleke");
    await page
      .locator('input[placeholder="olawale@example.com"]')
      .fill("eniola@lagos.ng");
    await page
      .locator('input[placeholder="0803 123 4567"]')
      .fill("+2348021112233");
    await page.getByLabel(/Allow \+1 Companion/i).check();
    await page.getByRole("button", { name: /add to guestbook/i }).click();
    await expect(page.getByText("Eniola Adeleke").first()).toBeVisible({
      timeout: 5000,
    });

    // Grab Eniola's RSVP link from drawer for conflict test later
    await page.getByText("Eniola Adeleke").first().click();
    await expect(page.getByText(/Guest Details/i)).toBeVisible();
    await page
      .getByRole("button", { name: /copy link/i })
      .first()
      .click();
    await expect(page.getByText(/Copied Link/i)).toBeVisible();
    const rsvpLink = await page.evaluate(() => navigator.clipboard.readText());
    await page.getByRole("button", { name: /close drawer/i }).click();

    // Navigate to seating
    await page.goto(`/events/${eventId}/seating`);
    await expect(
      page.getByRole("heading", { name: /Seating & Floor Plan/i })
    ).toBeVisible();

    // Create Table (capacity 1)
    await page
      .getByRole("button", { name: /(create first table|new table)/i })
      .first()
      .click();
    await page
      .locator('input[placeholder*="Table 01"]')
      .fill("Royal Intimate Table");
    await page.locator('input[type="number"]').fill("1");
    await page.getByRole("button", { name: /create table/i }).click();
    await expect(page.getByText("Royal Intimate Table").first()).toBeVisible({
      timeout: 5000,
    });

    // Assign Eniola to Table via accessible keyboard navigation on select
    const eniolaSelect = page.locator(
      'select[aria-label="Assign Eniola Adeleke to a table"]'
    );
    await expect(eniolaSelect).toBeVisible();
    const optionVal = await eniolaSelect
      .locator("option", { hasText: "Royal Intimate Table" })
      .getAttribute("value");
    await eniolaSelect.selectOption(optionVal!);
    await expect(page.getByText(/Seating chart updated/i)).toBeVisible({
      timeout: 5000,
    });

    // Eniola increases attending count to 2 via RSVP
    await page.goto(rsvpLink);
    await expect(page.getByText(/Your guest pass/i)).toBeVisible();
    await page.getByLabel(/Joyfully Accept/i).check();
    const attendeeSelect = page.locator('select[name="attendingCount"]');
    if (await attendeeSelect.isVisible()) {
      await attendeeSelect.selectOption("2");
      await page.locator('input[name="plusOneName"]').fill("Dr. Kunle Adeleke");
    }
    await page.getByRole("button", { name: /submit rsvp response/i }).click();
    await expect(page.getByText(/RSVP Confirmed & Honoured/i)).toBeVisible({
      timeout: 10000,
    });

    // Back to seating: Eniola is unseated with party size changed badge
    await page.goto(`/events/${eventId}/seating`);
    await expect(page.getByText(/party size changed/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Overview displays priority conflict card
    await page.goto(`/events/${eventId}`);
    await expect(page.getByText(/Next to Care For/i)).toBeVisible();
    await expect(page.getByText(/seating conflict/i).first()).toBeVisible();
  });
});
