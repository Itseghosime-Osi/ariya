import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

test("catering deck screenshot", async ({ page }) => {
  test.setTimeout(90_000);
  await createAndLoginUser(page, undefined, "catering_shot");
  const { eventId } = await createTestEvent(page);

  for (const [name, email] of [
    ["Eniola Adeleke", "eniola@lagos.ng"],
    ["Bisi Okonkwo", "bisi@lagos.ng"],
    ["Tunde Balogun", "tunde@lagos.ng"],
  ]) {
    await page.goto(`/events/${eventId}/guests`);
    await page.getByRole("button", { name: /add guest/i }).click();
    await page.locator('input[placeholder="Chief Olawale Adeyemi"]').fill(name);
    await page.locator('input[placeholder="olawale@example.com"]').fill(email);
    await page.getByRole("button", { name: /add to guestbook/i }).click();
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 5000 });
  }

  await page.goto(`/events/${eventId}/seating`);
  await expect(page.getByRole("main")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: /^Catering/ }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/catering-deck.png", fullPage: true });

  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /download the list as a pdf/i })
    .click();
  await (await download).saveAs("/tmp/catering-list.pdf");
});
