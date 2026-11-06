import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

/**
 * The catering deck: the three questions, the shopping list they produce, and the PDF a host
 * takes to a caterer. This is the only place the deck is exercised end to end — the unit tests
 * cover the arithmetic and the seam, not the wiring.
 */
test.describe("Catering shopping list", () => {
  test("answers the questions, reads the list, and downloads it", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await createAndLoginUser(page, undefined, "catering_host");
    const { eventId } = await createTestEvent(page);

    // A room with nobody in it has nothing to buy; the list is only worth reading once there are
    // guests to feed. Two is enough to prove the arithmetic reaches the page.
    await page.goto(`/events/${eventId}/guests`);
    for (const [name, email] of [
      ["Eniola Adeleke", "eniola@lagos.ng"],
      ["Bisi Okonkwo", "bisi@lagos.ng"],
    ]) {
      await page.getByRole("button", { name: /add guest/i }).click();
      await page
        .locator('input[placeholder="Chief Olawale Adeyemi"]')
        .fill(name);
      await page
        .locator('input[placeholder="olawale@example.com"]')
        .fill(email);
      await page.getByRole("button", { name: /add to guestbook/i }).click();
      await expect(page.getByText(name).first()).toBeVisible({
        timeout: 5000,
      });
    }

    await page.goto(`/events/${eventId}/seating`);
    await expect(page.getByRole("main")).toBeVisible({ timeout: 30_000 });

    // The deck is reachable from the rail.
    await page.getByRole("tab", { name: /^Catering/ }).click();

    // The three questions are the first thing on the deck.
    await expect(page.getByText(/Will you serve alcohol\?/i)).toBeVisible();
    await expect(page.getByText(/pudding or a photograph/i)).toBeVisible();
    await expect(page.getByText(/Takeaway packs/i).first()).toBeVisible();

    // The list renders, grouped by purchase unit.
    await expect(page.getByText(/The shopping list/i)).toBeVisible();
    await expect(page.getByText(/Jollof rice/i).first()).toBeVisible();

    // Choosing "no alcohol" removes the bar lines entirely — 4.2.3.
    expect(await page.getByText(/^Beer$/).count()).toBeGreaterThan(0);
    await page
      .getByRole("radio", { name: /^None$/ })
      .first()
      .click();
    await expect(page.getByText(/^Beer$/)).toHaveCount(0);
    await expect(page.getByText(/^Bartenders$/)).toHaveCount(0);

    // Back to a bar, and download the sheet.
    await page
      .getByRole("radio", { name: /Beer & wine/i })
      .first()
      .click();
    await expect(page.getByText(/^Beer$/)).toHaveCount(1);

    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: /download the list as a pdf/i })
      .click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("catering-list.pdf");

    // It is a real PDF, not an empty blob: the magic number, and a plausible size.
    const path = await file.path();
    expect(path).toBeTruthy();
    const { readFileSync } = await import("node:fs");
    const bytes = readFileSync(path!);
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(2000);
  });

  test("a decoration cake drops the cake from the list", async ({ page }) => {
    test.setTimeout(60_000);
    await createAndLoginUser(page, undefined, "catering_cake");
    const { eventId } = await createTestEvent(page);

    await page.goto(`/events/${eventId}/seating`);
    await expect(page.getByRole("main")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("tab", { name: /^Catering/ }).click();

    await page
      .getByRole("radio", { name: /^Dessert$/ })
      .first()
      .click();
    await expect(page.getByText(/^Cake, display$/)).toBeVisible();

    await page
      .getByRole("radio", { name: /Photo only/i })
      .first()
      .click();
    await expect(page.getByText(/^Cake, display$/)).toHaveCount(0);
  });
});
