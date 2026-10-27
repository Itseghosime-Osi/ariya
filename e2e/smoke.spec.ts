import { test, expect } from "@playwright/test";

test.describe("Celebration Suite Smoke Flow", () => {
  test("sign up -> create event through wizard -> view in My Events -> open overview", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `playwright_${timestamp}@owambe.ng`;
    const testPassword = "Celebration2026!";
    const coupleName = `Ada & Femi ${timestamp.toString().slice(-4)}`;
    const eventTitle = `The Grand Regal Nuptials of ${coupleName}`;
    const venueName = "The Grand Ballroom, Victoria Island";

    // 1. Visit sign up page
    await page.goto("/sign-up");
    await expect(page).toHaveTitle(/(Sign Up|Create Account) • Àríyá/i);

    // 2. Fill in registration dossier
    await page.locator("#fullName").fill("Adaeze Adeleke");
    await page.locator("#emailInput").fill(testEmail);
    await page.locator("#password").fill(testPassword);
    await page.locator("#confirmPassword").fill(testPassword);

    // 3. Submit registration form
    await page
      .getByRole("button", { name: /create celebration account/i })
      .click();

    // 4. Wait for navigation: automatically authenticated in local dev or sign in
    await page.waitForURL(/\/(events|sign-in)/, { timeout: 15000 });

    if (page.url().includes("/sign-in")) {
      await page.locator("#email").fill(testEmail);
      await page.locator("#password").fill(testPassword);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/events/, { timeout: 15000 });
    }

    // 5. Navigate to event creation wizard
    await page.goto("/events/new");
    await expect(page.locator("h1")).toContainText(
      /Create & Orchestrate Celebration/i
    );

    // Step 1: Celebration Details
    await page.locator("#couple").fill(coupleName);
    await page.locator("#title").fill(eventTitle);
    await page.locator("#venue").fill(venueName);
    await page.locator("#area").fill("Victoria Island, Lagos");

    // Proceed to Step 2
    await page
      .getByRole("button", { name: /continue to guest registry setup/i })
      .click();

    // Step 2: Intake Method
    await page.getByRole("button", { name: /continue to review/i }).click();

    // Step 3: Review & Launch
    await page
      .getByRole("button", { name: /create celebration workspace/i })
      .click();

    // 6. Verify Provisioned Success Screen
    await expect(page.getByText(/Celebration Workspace Ready!/i)).toBeVisible({
      timeout: 15000,
    });

    // 7. Click "View Portfolio" to view celebration in My Events
    await page.getByRole("link", { name: /view portfolio/i }).click();
    await page.waitForURL(/\/events$/, { timeout: 10000 });

    // 8. Assert celebration is visible in My Events
    await expect(page.getByText(eventTitle).first()).toBeVisible();

    // 9. Open Celebration Desk Overview
    await page
      .getByRole("link", { name: /open celebration desk/i })
      .first()
      .click();
    await page.waitForURL(/\/events\/[0-9a-f-]+/, { timeout: 10000 });

    // 10. Assert Overview Desk content loads
    await expect(page.getByText("Celebration Desk").first()).toBeVisible();
    await expect(page.getByText(coupleName).first()).toBeVisible();
    await expect(page.getByText("Every yes, together.").first()).toBeVisible();
  });
});
