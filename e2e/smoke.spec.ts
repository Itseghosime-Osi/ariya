import { test, expect } from "@playwright/test";

test.describe("Celebration Suite Smoke Flow", () => {
  test("sign up -> create event -> guest registry -> import csv -> copy invite link", async ({
    page,
    context,
  }) => {
    // Grant clipboard permissions for copy link test
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

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

    // 11. Navigate to Guest Registry via sidebar or direct link
    await page
      .getByRole("link", { name: /guest registry/i })
      .first()
      .click();
    await page.waitForURL(/\/events\/[0-9a-f-]+\/guests/, { timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: "Guest Registry" })
    ).toBeVisible();
    await expect(page.getByText(/FINAL 03/i)).toBeVisible();

    // 12. Open CSV Import Modal
    await page.getByRole("button", { name: /import csv/i }).click();
    await expect(page.getByText(/Upload Guest CSV Roster/i)).toBeVisible();

    // 13. Upload small sample CSV
    const sampleCsv = `Full Name,Phone Number,Email,Side,Group,VIP
Babatunde Adeleke,08031234567,babatunde@lagos.ng,VIP,High Table,Yes
Folashade Adeleke,08029876543,folashade@lagos.ng,Bride,Bridal Party,No`;

    await page.locator('input[type="file"]').setInputFiles({
      name: "sample_guests.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(sampleCsv),
    });

    // 14. Confirm Column Field Mapping step
    await expect(page.getByText(/Column Field Mapping/i)).toBeVisible();
    await page.getByRole("button", { name: /continue to validation/i }).click();

    // 15. Validation Preview step
    await expect(page.getByText(/Valid Rows/i)).toBeVisible();
    await expect(page.getByText("2").first()).toBeVisible();

    // 16. Commit Import
    await page.getByRole("button", { name: /import 2 guests/i }).click();

    // 17. Import Summary Screen
    await expect(page.getByText(/Import Completed!/i)).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: /view guest registry/i }).click();

    // 18. Verify guests appear in the registry table
    await expect(page.getByText("Babatunde Adeleke").first()).toBeVisible();
    await expect(page.getByText("Folashade Adeleke").first()).toBeVisible();

    // 19. Open Guest Detail Drawer by clicking guest name
    await page.getByText("Babatunde Adeleke").first().click();
    await expect(page.getByText(/Guest Details/i)).toBeVisible();
    await expect(page.getByText(/RSVP Invitation Link/i)).toBeVisible();

    // 20. Copy RSVP link and verify feedback
    await page
      .getByRole("button", { name: /copy link/i })
      .first()
      .click();
    await expect(page.getByText(/Copied Link/i)).toBeVisible();
  });
});
