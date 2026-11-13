import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

/** No serious or critical accessibility problems inside one part of the page. */
async function expectAccessible(page: Page, selector: string) {
  const results = await new AxeBuilder({ page }).include(selector).analyze();
  expect(
    results.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => v.id)
  ).toEqual([]);
}

/**
 * A new host is welcomed, says whose celebration it is, makes their first one, and is shown round
 * its desk; the First steps card is there to work through. Nothing comes back once seen, and the
 * tour can be replayed from the account menu.
 */
test("a new host is welcomed, toured and given their first steps", async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await createAndLoginUser(page, context, "onboard");
  // Onboarding stays away from automated browsers unless a test asks for it.
  await page.evaluate(() =>
    localStorage.setItem("ariya:test-onboarding", "on")
  );

  // The welcome, with the answer from sign-up already chosen.
  await page.goto("/events");
  const welcome = page.getByTestId("welcome-card");
  await expect(welcome).toBeVisible({ timeout: 10_000 });
  await expect(
    welcome.getByRole("heading", { name: /^Hello, User/ })
  ).toBeVisible();
  await expect(
    welcome.getByRole("radio", { name: /My own celebration/ })
  ).toHaveAttribute("aria-checked", "true");
  await expectAccessible(page, '[data-testid="welcome-card"]');
  await welcome.getByRole("radio", { name: /Someone else's/ }).click();
  await expect(
    welcome.getByRole("radio", { name: /Someone else's/ })
  ).toHaveAttribute("aria-checked", "true");
  await welcome
    .getByRole("button", { name: "Create my first celebration" })
    .click();
  await expect(page).toHaveURL(/\/events\/new/);

  // The first celebration, then the tour of its desk once the fireworks are over.
  const { eventId } = await createTestEvent(page);
  const tour = page.getByTestId("dashboard-tour");
  await expect(tour).toBeVisible({ timeout: 15_000 });
  await expect(tour.getByText("Step 1 of 5")).toBeVisible();
  await expectAccessible(page, '[data-testid="dashboard-tour"]');
  // A planner hears about switching between clients.
  await tour.getByRole("button", { name: "Next" }).click();
  await expect(
    tour.getByRole("heading", { name: "One place for every client" })
  ).toBeVisible();
  for (let n = 0; n < 3; n += 1)
    await tour.getByRole("button", { name: "Next" }).click();
  await tour.getByRole("button", { name: "Finish" }).click();
  await expect(tour).toBeHidden();

  // First steps, nothing done yet, each a link to where it is done.
  const steps = page.getByRole("region", {
    name: "Get your celebration ready",
  });
  await expect(steps).toBeVisible();
  await expect(steps.getByText(/First steps · 0 of 5/)).toBeVisible();
  await expectAccessible(page, '[data-tour="first-steps"]');
  await expect(
    steps.getByRole("link", { name: /^Add your guests/ })
  ).toHaveAttribute("href", `/events/${eventId}/guests`);
  await expect(
    steps.getByRole("link", { name: /^Invite your client and team/ })
  ).toBeVisible();

  // Seen once is enough: neither the welcome nor the tour comes back.
  await page.reload();
  await page.waitForTimeout(2500);
  await expect(page.getByTestId("welcome-card")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-tour")).toHaveCount(0);

  // But the tour can be replayed from the account menu, and Esc ends it.
  // By keyboard: in development the framework's own badge sits over the sidebar's corner.
  await page.getByRole("button", { name: /Account Menu$/ }).focus();
  await page.keyboard.press("Enter");
  const replay = page.getByRole("link", { name: "Show me around" });
  await expect(replay).toBeVisible();
  await replay.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("dashboard-tour")).toBeVisible({
    timeout: 10_000,
  });
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("dashboard-tour")).toBeHidden();

  // Away from the desk: the page's own tips, a Help button that brings them back, and a pill that
  // leads back to First steps.
  await page.goto(`/events/${eventId}/reminders`);
  const tips = page.getByTestId("page-tips-reminders");
  await expect(tips).toBeVisible({ timeout: 15_000 });
  await expectAccessible(page, '[data-testid="page-tips-reminders"]');
  await tips.getByRole("button", { name: "Got it" }).click();
  await expect(tips).toBeHidden();
  await page.getByTestId("help-button").click();
  await expect(page.getByTestId("page-tips-reminders")).toBeVisible();
  // With no guests yet, the empty list says where to start.
  await expect(page.getByRole("link", { name: "Add guests" })).toBeVisible();

  const pill = page.getByTestId("first-steps-pill");
  await expect(pill).toContainText("First steps · 0 of 5");
  await pill.click();
  await page.getByRole("link", { name: /^Lay out the seating/ }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${eventId}/seating`));

  // Help on the desk is the tour.
  await page.goto(`/events/${eventId}`);
  await page.getByTestId("help-button").click();
  await expect(page.getByTestId("dashboard-tour")).toBeVisible({
    timeout: 10_000,
  });
  await page.keyboard.press("Escape");

  // Hiding First steps is for good.
  await steps.getByRole("button", { name: "Hide first steps" }).click();
  await expect(steps).toBeHidden();
  await page.reload();
  await page.waitForTimeout(1500);
  await expect(
    page.getByRole("region", { name: "Get your celebration ready" })
  ).toHaveCount(0);
});
