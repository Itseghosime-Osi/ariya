import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

/**
 * The venue studio journey from checklist 7.5: pick a venue, lay the hall out, compare the
 * suggestion with what was there, place an air conditioner, read the verdict, then take the plan
 * to the checklist and tick a task off.
 *
 * The studio is a 3D canvas inside an iframe, so every step here drives the HTML panel beside it
 * rather than the canvas: that is also the keyboard path a host without a mouse would use.
 */
test.describe("Venue studio", () => {
  test("pick a venue, arrange, compare, cool, and tick the checklist", async ({
    page,
    context,
  }) => {
    // One journey across two pages and a wasm load: the default 30 s is not enough on CI.
    test.setTimeout(120_000);
    await createAndLoginUser(page, context, "studio_host");
    const { eventId } = await createTestEvent(page);

    await page.goto(`/events/${eventId}/seating`);
    await expect(page.getByTestId("hall-studio")).toBeVisible();

    // 1. Pick a venue. The Room deck is where the venue cards live.
    await page.getByRole("tab", { name: /Room/ }).click();
    const marquee = page.getByRole("button", { name: /Marquee/ });
    await marquee.click();
    await expect(marquee).toHaveAttribute("aria-pressed", "true");

    // 2. Put some tables in the hall, so there is something to arrange.
    await page.getByRole("button", { name: "Add a table" }).click();
    await page.getByRole("button", { name: "Row of 3" }).click();
    await expect(page.getByText(/tables added to the hall/i)).toBeVisible({
      timeout: 10_000,
    });

    // 3. Ask the engine for three layouts and apply the first.
    await page.getByRole("tab", { name: /Fit/ }).click();
    await page.getByRole("button", { name: /Suggest three layouts/i }).click();
    const firstOption = page.getByRole("button", { name: /Use this layout/i });
    await expect(firstOption.first()).toBeVisible({ timeout: 20_000 });
    await firstOption.first().click();

    // 4. Compare the new layout with what was there, then keep it.
    const compareBar = page.getByRole("group", {
      name: /Compare the current and new layouts/i,
    });
    await expect(compareBar).toBeVisible();
    await compareBar.getByRole("button", { name: "Current" }).click();
    await compareBar.getByRole("button", { name: "New" }).click();
    await compareBar.getByRole("button", { name: /Keep this/i }).click();
    await expect(compareBar).toBeHidden();

    // 5. Place an air conditioner and read the verdict.
    await page.getByRole("tab", { name: /Cooling/ }).click();
    await expect(
      page.getByRole("heading", { name: "The verdict" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Add one" }).click();
    await expect(page.getByText(/Unit 1 ·/)).toBeVisible();

    // 6. Take the plan to the checklist. The first visit seeds it from the hall.
    await page.goto(`/events/${eventId}/checklist`);
    const firstTask = page.getByRole("checkbox").first();
    await expect(firstTask).toBeVisible({ timeout: 30_000 });
    await expect(firstTask).toHaveAttribute("aria-checked", "false");
    await firstTask.click();
    await expect(firstTask).toHaveAttribute("aria-checked", "true");
  });
});
