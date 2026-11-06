import { expect, test } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";
import { serviceRoleClient } from "./fixtures/service-role";

/**
 * 6.4.5 — the run sheet survives the signal dropping.
 *
 * The thing being tested is the service worker, not the page: the page loads once online, then the
 * network is cut and the same URL is requested again. A host standing in a hall is the person this
 * exists for, so the assertion is that the sheet still shows the day's times and contacts with no
 * network at all.
 */
test.describe("The run sheet works with no signal", () => {
  test("the checklist and the run sheet both open offline", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    const db = serviceRoleClient();

    await createAndLoginUser(page, context, "offline_host");
    const { eventId } = await createTestEvent(page);

    // A vendor with a reachable contact, which is what the run sheet lists on the day.
    await db.from("vendors").insert({
      event_id: eventId,
      name: "Mama Titi Catering",
      category: "Catering",
      contact_name: "Titi",
      contact_phone: "+234 801 234 5678",
      cost_kobo: 250_000_00,
      deposit_kobo: 50_000_00,
    });

    // A day-phase row with a time slot, so the sheet has something to show.
    await db.from("tasks").insert({
      event_id: eventId,
      title: "Brief the ushers",
      phase: "day",
      status: "todo",
      time_slot: "before the guests arrive",
      source: "template",
      source_key: `day.ushers.${Date.now()}`,
    });

    const checklistUrl = `/events/${eventId}/checklist`;
    const runSheetUrl = `/events/${eventId}/day-of`;

    // Warm the worker: visit the checklist, which registers the service worker and fills the cache.
    await page.goto(checklistUrl);
    await expect(page.locator("h1")).toBeVisible();
    await page.waitForFunction(
      async () => {
        if (!("serviceWorker" in navigator)) return false;
        const reg = await navigator.serviceWorker.getRegistration();
        return Boolean(reg?.active);
      },
      undefined,
      { timeout: 30_000 }
    );

    // Visit the run sheet once online, so it is stored too.
    await page.goto(runSheetUrl);
    await expect(page.getByText("Mama Titi Catering")).toBeVisible({
      timeout: 15_000,
    });

    // Cut the network entirely.
    await context.setOffline(true);

    await page.goto(runSheetUrl);
    await expect(page.getByText("Brief the ushers")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("before the guests arrive")).toBeVisible();
    await expect(page.getByText("+234 801 234 5678")).toBeVisible();

    await page.goto(checklistUrl);
    await expect(page.locator("h1")).toBeVisible({ timeout: 15_000 });

    await context.setOffline(false);
  });
});
