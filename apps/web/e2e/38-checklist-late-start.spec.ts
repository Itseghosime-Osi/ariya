import { test, expect, type Page } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";
import { serviceRoleClient } from "./fixtures/service-role";

/**
 * The 21 Nov usability review: a planner started the checklist the day before the event, had to
 * draw a hall before it would build, and was then shown "Fix the date", due in January, as the
 * thing to do next. These check the list builds without a hall, keeps already-past rows apart, and
 * picks up the venue's rows once a hall is drawn later.
 */

/** Open the checklist and wait for it to build itself (it needs the plan engine to load first). */
async function openBuiltChecklist(page: Page, eventId: string) {
  await page.goto(`/events/${eventId}/checklist`);
  const build = page.getByRole("button", { name: /Build the checklist/i });
  const firstTick = page.getByRole("checkbox", { name: /^Tick / }).first();
  await expect(build.or(firstTick)).toBeVisible({ timeout: 30_000 });
  // The first run seeds itself once the engine is ready; the button is only a fallback.
  for (let attempt = 0; attempt < 10; attempt++) {
    if ((await build.count()) === 0) break;
    if (await build.isEnabled()) await build.click();
    try {
      await expect(firstTick).toBeVisible({ timeout: 3_000 });
      break;
    } catch {
      // Not seeded yet.
    }
  }
  await expect(firstTick).toBeVisible({ timeout: 30_000 });
}

test.describe("Checklist for a late start", () => {
  test.setTimeout(180_000);

  test("builds without a hall plan and keeps rows already past due apart", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "late_start");
    const { eventId } = await createTestEvent(page);

    // Make it tomorrow at 2 PM WAT, as in the review.
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(13, 0, 0, 0);
    const { error } = await serviceRoleClient()
      .from("events")
      .update({ date: tomorrow.toISOString() })
      .eq("id", eventId);
    expect(error).toBeNull();

    // No hall has been drawn, and the list still builds.
    await openBuiltChecklist(page, eventId);

    const earlier = page.getByRole("region", {
      name: "Tasks from before you started",
    });
    await expect(earlier).toBeVisible();
    await expect(earlier).toContainText(/due before this checklist began/);
    // The list opens on what is ahead — the day itself — not on January's "Fix the date".
    await expect(page.getByRole("button", { name: /^Day of/ })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    // The earlier rows say so instead of showing a red date months in the past.
    await page.getByRole("button", { name: /^Foundations/ }).click();
    await expect(page.getByText("Before you started").first()).toBeVisible();

    await earlier.getByRole("button", { name: /^Set aside all \d+/ }).click();
    await expect(earlier).toBeHidden({ timeout: 15_000 });
    await expect(
      page.getByText(/^Set aside \d+ earlier tasks?\./)
    ).toBeVisible();
  });

  test("adds the venue's rows once a hall is drawn after the list was built", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "late_hall");
    const { eventId } = await createTestEvent(page);

    // Built before any hall: an indoor hall is assumed, so there is no rain plan.
    await openBuiltChecklist(page, eventId);
    await expect(page.getByText("Write the rain plan")).toHaveCount(0);

    // Now draw the venue as a marquee.
    await page.goto(`/events/${eventId}/seating`);
    await expect(page.getByTestId("hall-studio")).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("radio", { name: "Simple", exact: true }).click();
    const marquee = page.getByRole("radio", { name: /^Marquee/ });
    await marquee.click();
    await expect(marquee).toHaveAttribute("aria-checked", "true");
    // The layout saves on a short debounce.
    await page.waitForTimeout(2_000);

    // Opening the checklist again adds the tent's rows, without touching the rest.
    await page.goto(`/events/${eventId}/checklist`);
    await expect(page.getByText("Write the rain plan")).toBeVisible({
      timeout: 30_000,
    });
  });
});
