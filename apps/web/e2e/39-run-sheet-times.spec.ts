import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

/** The run sheet's own times: set with the branded picker, and a failed save says so in place. */
test.describe("Run sheet times", () => {
  test.setTimeout(180_000);

  test("sets an exact time, and a save without a connection says so instead of breaking the page", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "run_sheet_times");
    const { eventId } = await createTestEvent(page);

    // The run sheet reads the checklist's day rows, so let the checklist build first.
    await page.goto(`/events/${eventId}/checklist`);
    await expect(
      page.getByRole("checkbox", { name: /^Tick / }).first()
    ).toBeVisible({ timeout: 60_000 });

    await page.goto(`/events/${eventId}/day-of`);
    await page.getByRole("button", { name: "Edit times" }).click();

    // Set 10:30 AM on the first row with the picker; it saves once, on Done.
    await page
      .getByRole("button", { name: /^Time for / })
      .first()
      .click();
    let sheet = page.getByRole("dialog");
    await sheet.getByRole("button", { name: "10 o'clock" }).click();
    await sheet.getByRole("button", { name: "30 minutes" }).click();
    await sheet
      .getByRole("group", { name: "Morning or afternoon" })
      .getByRole("button", { name: "AM" })
      .click();
    await sheet.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("button", { name: /: 10:30 AM$/ })).toBeVisible(
      { timeout: 15_000 }
    );

    // Offline, the next save fails in place: the sheet stays, with a message.
    await page.getByRole("button", { name: /: 10:30 AM$/ }).click();
    sheet = page.getByRole("dialog");
    await sheet.getByRole("button", { name: "9 o'clock" }).click();
    await context.setOffline(true);
    await sheet.getByRole("button", { name: "Done" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Couldn't save" })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "The order of the day" })
    ).toBeVisible();
    await context.setOffline(false);
  });
});
