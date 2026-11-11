import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";
import { serviceRoleClient } from "./fixtures/service-role";

/**
 * A host shares the floor plan with the venue: a view-only link that shows the room and tables but
 * no guest names, keeps working while the host goes on editing, and stops the moment they stop it.
 */
test("share a view-only floor plan, keep editing, then stop sharing", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await createAndLoginUser(page, context, "share_host");
  const { eventId } = await createTestEvent(page);

  // A guest whose name must never reach the shared page.
  const db = serviceRoleClient();
  await db.from("guests").insert({
    event_id: eventId,
    name: "Private Guest Name",
    side: "bride",
    rsvp_token: `share-${Date.now()}`,
  });

  await page.goto(`/events/${eventId}/seating`);
  await expect(page.getByTestId("hall-studio")).toBeVisible({
    timeout: 60_000,
  });

  // A hall with tables.
  await page.getByRole("tab", { name: /^Fit/ }).click();
  await page.getByLabel(/Set the number of tables/i).fill("4");
  await page.getByRole("button", { name: /^Apply$/ }).click();
  await expect(page.getByTestId("hall-save-status")).toHaveAttribute(
    "data-state",
    "saved",
    {
      timeout: 20_000,
    }
  );

  // Make the link.
  await page.getByRole("button", { name: "Share the floor plan" }).click();
  await page.getByRole("button", { name: "Create a view-only link" }).click();
  const linkBox = page.getByTestId("hall-share").getByRole("textbox");
  await expect(linkBox).toHaveValue(/\/plan\/[A-Za-z0-9_-]{32,}/, {
    timeout: 20_000,
  });
  const url = await linkBox.inputValue();

  // Anyone with the link, signed out, sees the room and tables, but no guest.
  const visitor = await browser.newContext();
  const v = await visitor.newPage();
  await v.goto(url);
  await expect(v.getByText(/Floor plan · view only/i)).toBeVisible();
  await expect(v.getByRole("heading", { name: "Tables" })).toBeVisible();
  await expect(v.getByText("Private Guest Name")).toHaveCount(0);
  await expect(
    v.getByRole("button", { name: /measured floor plan/i })
  ).toBeVisible();

  // The host keeps editing; the link does not get in the way of saving.
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: /^Room/ }).click();
  const width = page.getByLabel(/^Width/).first();
  await width.fill("32");
  await width.press("Tab");
  await expect(page.getByTestId("hall-save-status")).toHaveAttribute(
    "data-state",
    "saved",
    {
      timeout: 20_000,
    }
  );
  await v.reload();
  await expect(v.getByText(/32 × 20 m/)).toBeVisible();

  // Stop sharing: the old link is gone at once.
  await page.getByRole("button", { name: "Share the floor plan" }).click();
  await page.getByRole("button", { name: "Stop sharing" }).click();
  await expect(
    page.getByRole("button", { name: "Create a view-only link" })
  ).toBeVisible({
    timeout: 20_000,
  });
  const gone = await v.goto(url);
  expect(gone?.status()).toBe(404);
  await expect(v.getByText("This floor plan is not shared")).toBeVisible();
  await expect(v.getByText(/Floor plan · view only/i)).toHaveCount(0);
  await visitor.close();
});
