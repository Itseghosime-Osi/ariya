import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

test.describe("Guest Registry & CSV Ingestion", () => {
  test("tanstack registry, add guest, csv intake, search & filter", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "guest_planner");
    const { eventId } = await createTestEvent(page);

    // Navigate to Guest Registry
    await page.goto(`/events/${eventId}/guests`);
    await expect(page.locator("h1")).toContainText(/Guest Registry/i);

    // Add first guest manually
    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .locator('input[placeholder="Chief Olawale Adeyemi"]')
      .fill("Babatunde Adeleke");
    await page
      .locator('input[placeholder="olawale@example.com"]')
      .fill("babatunde@lagos.ng");
    await page
      .locator('input[placeholder="0803 123 4567"]')
      .fill("+2348031234567");
    await page.getByRole("button", { name: /add to guestbook/i }).click();

    await expect(page.getByText("Babatunde Adeleke").first()).toBeVisible({
      timeout: 5000,
    });

    // Open CSV Import Modal
    await page.getByRole("button", { name: /import csv/i }).click();
    await expect(page.getByText(/Upload Guest CSV Roster/i)).toBeVisible();

    const sampleCsv = `Full Name,Phone Number,Email,Side,Group,VIP,Plus Ones
Folashade Adeleke,08029876543,folashade@lagos.ng,Bride,Bridal Party,No,1
Damilola Ojo,08035557777,dami@lagos.ng,Groom,Friends,No,0`;

    await page.locator('input[type="file"]').setInputFiles({
      name: "sample_guests.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(sampleCsv),
    });

    // Confirm Column Field Mapping
    await expect(page.getByText(/Column Field Mapping/i)).toBeVisible();
    await page.getByRole("button", { name: /continue to validation/i }).click();

    // Validation Preview
    await expect(page.getByText(/Valid Rows/i)).toBeVisible();
    await expect(page.getByText("2").first()).toBeVisible();

    // Commit Import
    await page.getByRole("button", { name: /import 2 guests/i }).click();

    // Import Summary
    await expect(page.getByText(/Import Completed!/i)).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: /view guest registry/i }).click();

    // Verify imported guests appear
    await expect(page.getByText("Folashade Adeleke").first()).toBeVisible();
    await expect(page.getByText("Damilola Ojo").first()).toBeVisible();

    // Search filter
    await page
      .locator('input[placeholder*="Search by name"]')
      .fill("Folashade");
    await expect(page.getByText("Folashade Adeleke").first()).toBeVisible();
    await expect(page.getByText("Damilola Ojo")).not.toBeVisible();
  });

  test("dedicated import route (/events/[eventId]/guests/import) intake through to summary", async ({
    page,
    context,
  }) => {
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    page.on("pageerror", (err) => console.log("PAGE ERROR:", err));

    await createAndLoginUser(page, context, "guest_importer");
    const { eventId } = await createTestEvent(page);

    // Navigate to dedicated route /events/[eventId]/guests/import
    await page.goto(`/events/${eventId}/guests/import`);
    await expect(page.locator("h1")).toContainText(/Import Guest Registry/i);

    const sampleCsv = `Full Name,Phone Number,Email,Side,Group,VIP,Plus Ones
Chief Olumide Balogun,08023456789,olumide@lagos.ng,Groom,VIP Elders,Yes,2
Yetunde Adeleke,08098765432,yetunde@lagos.ng,Bride,Bridal Party,No,1`;

    // Step 1: Upload Dropzone
    await expect(page.getByText(/Upload Guest CSV Roster/i)).toBeVisible();
    await expect(page.getByText(/Upload Guest CSV Roster/i)).toBeVisible();
    const fileInput = page.locator('input[type="file"]');
    console.log("File input count:", await fileInput.count());
    await fileInput.setInputFiles({
      name: "guests_roster.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(sampleCsv),
    });

    // Step 2: Mapping Desk
    await expect(page.getByText(/Column Field Mapping/i)).toBeVisible();
    await page.getByRole("button", { name: /continue to validation/i }).click();

    // Step 3: Validation Preview
    await expect(page.getByText(/Valid Rows/i)).toBeVisible();
    await expect(page.getByText("2").first()).toBeVisible();

    // Commit import
    await page.getByRole("button", { name: /import 2 guests/i }).click();

    // Step 4: Summary confirmation
    await expect(page.getByText(/Import Completed!/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/Guests Added/i)).toBeVisible();

    // Navigate to registry and verify guests appear
    await page.getByRole("button", { name: /view guest registry/i }).click();
    await expect(page.getByText("Chief Olumide Balogun").first()).toBeVisible();
    await expect(page.getByText("Yetunde Adeleke").first()).toBeVisible();
  });
});
