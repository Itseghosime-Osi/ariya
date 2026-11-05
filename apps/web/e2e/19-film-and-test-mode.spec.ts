import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

test.describe("Invitation film and test mode", () => {
  test("test mode hides the invitation from guests, then the film opens it", async ({
    page,
    context,
    browser,
  }) => {
    await createAndLoginUser(page, context, "film_host");
    const { eventId } = await createTestEvent(page);

    await page.goto(`/events/${eventId}/guests`);
    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .locator('input[placeholder="Chief Olawale Adeyemi"]')
      .fill("Amaka Obi");
    await page.getByRole("button", { name: /add to guestbook/i }).click();
    await page.getByText("Amaka Obi").first().click();
    await page
      .getByRole("button", { name: /copy link/i })
      .first()
      .click();
    const inviteUrl = await page.evaluate(() => navigator.clipboard.readText());

    const guestSees = async () => {
      const guest = await browser.newContext();
      const gp = await guest.newPage();
      await gp.goto(inviteUrl);
      return { guest, gp };
    };

    // Test mode: the host can look, the guest cannot.
    await page.goto(`/events/${eventId}/page-editor`);
    await page.getByRole("tab", { name: "Film" }).click();
    await page.getByRole("switch", { name: /invitation is live/i }).click();
    await expect(page.getByText(/Test mode/i).first()).toBeVisible();

    let { guest, gp } = await guestSees();
    await expect(gp.getByText(/not open yet/i)).toBeVisible();
    await expect(gp.getByLabel(/Joyfully Accept/i)).toHaveCount(0);
    await guest.close();

    await page.goto(inviteUrl);
    await expect(page.getByTestId("invitation-test-banner")).toBeVisible();

    // Live again, with the film switched on: the guest gets the film first.
    await page.goto(`/events/${eventId}/page-editor`);
    await page.getByRole("tab", { name: "Film" }).click();
    await page.getByRole("switch", { name: /invitation is live/i }).click();
    await page
      .getByRole("switch", { name: /play the film for guests/i })
      .click();
    await page.getByRole("button", { name: /^save film$/i }).click();
    await expect(page.getByText("Film saved.")).toBeVisible();

    ({ guest, gp } = await guestSees());
    await expect(gp.getByText(/tap to open/i)).toBeVisible();
    await gp.getByRole("button", { name: /skip the film/i }).click();
    await expect(gp.getByLabel(/Joyfully Accept/i)).toBeVisible();
    await guest.close();
  });

  test("the film can never run past 45 seconds", async ({ page, context }) => {
    await createAndLoginUser(page, context, "film_cap_host");
    const { eventId } = await createTestEvent(page);
    await page.goto(`/events/${eventId}/page-editor`);
    await page.getByRole("tab", { name: "Film" }).click();

    // Stretch the scenes as far as they go: the Longer buttons run out of seconds, not the film.
    const open = page.locator('button[aria-label="Longer"]:not([disabled])');
    for (let i = 0; i < 80 && (await open.count()) > 0; i += 1) {
      await open.first().click();
    }
    await expect(open).toHaveCount(0);
    const total = await page
      .getByText(/s on a guest’s own link/i)
      .first()
      .textContent();
    expect(Number(/(\d+)s/.exec(total ?? "")?.[1])).toBeLessThanOrEqual(45);
  });
});
