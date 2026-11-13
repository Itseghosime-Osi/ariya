import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";
import { serviceRoleClient } from "./fixtures/service-role";

/**
 * The seating studio's dark interface keeps every word readable: the Simple / Full studio switch,
 * the panel's headings, a guest's diet chip and the share menu, on a tablet-sized laptop and a
 * full one. Checked with Axe's colour-contrast rule, the hall's own 3D view left out.
 */
test("the dark studio passes colour contrast at 1000 and 1440", async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  await createAndLoginUser(page, context, "dark_contrast");
  const { eventId } = await createTestEvent(page);
  const db = serviceRoleClient();
  const { data } = await db
    .from("guests")
    .insert([
      {
        event_id: eventId,
        name: "Naomi Ijeme",
        side: "bride",
        rsvp_token: `dc-${Date.now()}-1`,
      },
      {
        event_id: eventId,
        name: "Meekness Moshood",
        side: "groom",
        rsvp_token: `dc-${Date.now()}-2`,
      },
    ])
    .select("id");
  await db.from("rsvps").upsert(
    data!.map((g) => ({
      guest_id: g.id,
      status: "accepted",
      attending_count: 1,
      dietary: "Onions, pepper",
      responded_at: new Date().toISOString(),
    })),
    { onConflict: "guest_id" }
  );

  for (const [width, height] of [
    [1440, 900],
    [1000, 650],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(`/events/${eventId}/seating`);
    await expect(page.getByTestId("hall-studio")).toBeVisible({
      timeout: 60_000,
    });
    // The studio's own switch, as a host would use it; it is remembered for the next visit.
    const toDark = page.getByRole("button", { name: "Dark interface" });
    if (await toDark.isVisible()) await toDark.click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-studio-theme",
      "dark"
    );
    // The share menu's buttons are in the check too.
    await page.getByRole("button", { name: "Share the floor plan" }).click();
    await expect(page.getByTestId("hall-share")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('[data-testid="hall-studio"]')
      .exclude("iframe")
      .withRules(["color-contrast"])
      .analyze();
    expect(
      results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(" "))),
      `contrast at ${width}px`
    ).toEqual([]);
    await page.keyboard.press("Escape");
  }
});
