import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

/**
 * Under a tent the roof is drawn over the tables. The host can make it see-through or hide it to
 * work on the seating, and the setting only appears where there is a roof to change.
 */
test("a tent roof can be faded or hidden, and only tents offer it", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await createAndLoginUser(page, context, "roof_host");
  const { eventId } = await createTestEvent(page);
  await page.goto(`/events/${eventId}/seating`);
  await expect(page.getByTestId("hall-studio")).toBeVisible({
    timeout: 60_000,
  });

  const view = page.getByTestId("hall-studio");
  // A hall has no roof to change.
  await expect(view.getByRole("button", { name: /^Roof,/ })).toHaveCount(0);

  await page.getByRole("tab", { name: /^Room/ }).click();
  await page.getByRole("button", { name: /^Stretch tent/ }).click();
  const roof = view.getByRole("button", { name: /^Roof,/ });
  await expect(roof).toHaveAccessibleName("Roof, 60% solid");

  await roof.click();
  const panel = page.getByTestId("roof-control");
  await panel.getByRole("button", { name: "Hide" }).click();
  await expect(roof).toHaveAccessibleName("Roof, hidden");
  await panel.getByRole("button", { name: "Solid" }).click();
  await expect(roof).toHaveAccessibleName("Roof, 100% solid");
  await panel.getByRole("slider", { name: "How solid the roof is" }).fill("30");
  await expect(roof).toHaveAccessibleName("Roof, 30% solid");

  // The setting stays on this device.
  await page.reload();
  await expect(page.getByTestId("hall-studio")).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByTestId("hall-studio").getByRole("button", {
      name: /^Roof,/,
    })
  ).toHaveAccessibleName("Roof, 30% solid");

  // Back to a hall, and the control goes away.
  await page.getByRole("tab", { name: /^Room/ }).click();
  await page.getByRole("button", { name: /^Pillar-free hall/ }).click();
  await expect(
    page.getByTestId("hall-studio").getByRole("button", {
      name: /^Roof,/,
    })
  ).toHaveCount(0);
});
