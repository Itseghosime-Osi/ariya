import { test, expect } from "@playwright/test";

test.describe("Celebration Suite Smoke Flow", () => {
  test("sign up -> create event -> guest registry -> import csv -> copy invite link -> submit rsvp -> publish event", async ({
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
    const eventId = page.url().split("/events/")[1].split("/")[0].split("?")[0];

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
    const sampleCsv = `Full Name,Phone Number,Email,Side,Group,VIP,Plus Ones
Babatunde Adeleke,08031234567,babatunde@lagos.ng,VIP,High Table,Yes,0
Folashade Adeleke,08029876543,folashade@lagos.ng,Bride,Bridal Party,No,1`;

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

    // 21. Retrieve copied invitation URL from clipboard
    const inviteUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(inviteUrl).toContain("/i/");

    // Close Babatunde's drawer
    await page.getByRole("button", { name: /close drawer/i }).click();

    // Also grab Folashade Adeleke's RSVP link for seating conflict testing
    await page.getByText("Folashade Adeleke").first().click();
    await expect(page.getByText(/Guest Details/i)).toBeVisible();
    await page
      .getByRole("button", { name: /copy link/i })
      .first()
      .click();
    await expect(page.getByText(/Copied Link/i)).toBeVisible();
    const folashadeInviteUrl = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    expect(folashadeInviteUrl).toContain("/i/");

    // Close Folashade's drawer
    await page.getByRole("button", { name: /close drawer/i }).click();

    // 22. Open the guest invitation link
    await page.goto(inviteUrl);
    await expect(page.getByText(/Personal Celebration Pass/i)).toBeVisible();
    await expect(page.getByText("Babatunde Adeleke").first()).toBeVisible();

    // 23. Submit RSVP: Joyfully Accept with dietary preference and note
    await page.getByLabel(/Joyfully Accept/i).check();
    await page
      .locator('input[name="dietary"]')
      .fill("Jollof rice and plantain");
    await page.locator('input[name="email"]').fill("babatunde@lagos.ng");
    await page
      .locator('textarea[name="note"]')
      .fill("May your union be blessed beyond measure!");
    await page.getByRole("button", { name: /submit rsvp response/i }).click();

    // 24. Verify Confirmed Pass Screen & Check-In Pass
    await expect(page.getByText(/RSVP Confirmed & Honoured/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText(/We Look Forward to Celebrating with You/i)
    ).toBeVisible();

    const checkInCodeElement = page
      .locator('span.font-mono:has-text("ARY-")')
      .first();
    await expect(checkInCodeElement).toBeVisible();
    const checkInCode = (await checkInCodeElement.textContent())?.trim();
    expect(checkInCode).toMatch(/^ARY-[A-Z0-9]+-[A-Z0-9]+$/);

    // 25. Verify confirmation email arrived in Mailpit
    const mailpitRes = await page.request.get(
      "http://127.0.0.1:57324/api/v1/messages"
    );
    expect(mailpitRes.ok()).toBe(true);
    const mailpitData = (await mailpitRes.json()) as {
      messages: { Subject: string; To: { Address: string }[] }[];
    };
    const rsvpMail = mailpitData.messages.find((m) =>
      m.To.some((recipient) => recipient.Address === "babatunde@lagos.ng")
    );
    expect(rsvpMail).toBeDefined();
    expect(rsvpMail?.Subject).toContain("Seat is Reserved");

    // 26. Return to Celebration Overview Desk and assert accepted guests count updated
    await page.goto(`/events/${eventId}`);
    await expect(page.getByText(/guests confirmed/i)).toBeVisible();
    await expect(page.getByText("1 of 2 people").first()).toBeVisible();

    // 27. Navigate to Event Page Editor and verify initial 404 for unshared public page
    await page.goto(`/events/${eventId}/page-editor`);
    await expect(page.getByText(/Event Page Editor/i)).toBeVisible();

    const publicPageLink = page.getByRole("link", {
      name: /view public page/i,
    });
    const publicHref = await publicPageLink.getAttribute("href");
    expect(publicHref).toContain("/e/");

    // Before toggling isPublic, public route returns 404
    const unpubRes = await page.goto(publicHref!);
    expect(unpubRes?.status()).toBe(404);

    // 28. Enable public discovery in Page Editor and Save
    await page.goto(`/events/${eventId}/page-editor`);
    const isPublicCheckbox = page.locator('input[type="checkbox"]').first();
    await isPublicCheckbox.check();
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/updates saved successfully/i)).toBeVisible({
      timeout: 10000,
    });

    // 29. Now visit public route and verify it renders celebration details
    const pubRes = await page.goto(publicHref!);
    expect(pubRes?.status()).toBe(200);
    await expect(page.getByText(eventTitle).first()).toBeVisible();
    await expect(page.getByText(venueName).first()).toBeVisible();

    // 30. Seating: Navigate to Seating Plan and create tables
    await page.goto(`/events/${eventId}/seating`);
    await expect(page.getByText(/Seating & Floor Plan/i)).toBeVisible();

    // Table 1: VIP Table with capacity 1 (for capacity enforcement testing)
    await page
      .getByRole("button", { name: /(create first table|new table)/i })
      .first()
      .click();
    await page.locator('input[placeholder*="Table 01"]').fill("VIP High Table");
    await page.locator('input[type="number"]').fill("1");
    await page.getByRole("button", { name: /create table/i }).click();
    await expect(page.getByText("VIP High Table").first()).toBeVisible({
      timeout: 5000,
    });

    // Table 2: Intimate Table with capacity 1 (for RSVP party-size increase conflict test)
    await page.getByRole("button", { name: /new table/i }).click();
    await page.locator('input[placeholder*="Table 01"]').fill("Intimate Table");
    await page.locator('input[type="number"]').fill("1");
    await page.getByRole("button", { name: /create table/i }).click();
    await expect(page.getByText("Intimate Table").first()).toBeVisible({
      timeout: 5000,
    });

    // Table 3: Family Table with capacity 8
    await page.getByRole("button", { name: /new table/i }).click();
    await page.locator('input[placeholder*="Table 01"]').fill("Family Table");
    await page.locator('input[type="number"]').fill("8");
    await page.getByRole("button", { name: /create table/i }).click();
    await expect(page.getByText("Family Table").first()).toBeVisible({
      timeout: 5000,
    });

    // 31. Seat Babatunde Adeleke to VIP High Table via accessible keyboard select
    const babatundeSelect = page.locator(
      'select[aria-label="Assign Babatunde Adeleke to a table"]'
    );
    const vipOptionVal = await babatundeSelect
      .locator("option", { hasText: "VIP High Table" })
      .getAttribute("value");
    await babatundeSelect.selectOption(vipOptionVal!);
    await expect(page.getByText(/Seating chart updated/i)).toBeVisible({
      timeout: 5000,
    });

    // 32. Over-capacity attempt: Try to seat Folashade Adeleke into the full VIP High Table (capacity 1)
    const folashadeSelect = page.locator(
      'select[aria-label="Assign Folashade Adeleke to a table"]'
    );
    await folashadeSelect.selectOption(vipOptionVal!);
    await expect(page.getByText(/capacity exceeded/i)).toBeVisible({
      timeout: 5000,
    });

    // 33. Seat Folashade Adeleke to Intimate Table (capacity 1)
    const intimateOptionVal = await folashadeSelect
      .locator("option", { hasText: "Intimate Table" })
      .getAttribute("value");
    await folashadeSelect.selectOption(intimateOptionVal!);
    await expect(page.getByText(/Seating chart updated/i)).toBeVisible({
      timeout: 5000,
    });

    // 34. Test Seating Conflict on RSVP: Folashade opens invite link and increases attending count to 2 (+1 escort)
    await page.goto(folashadeInviteUrl);
    await expect(page.getByText(/Personal Celebration Pass/i)).toBeVisible();
    await expect(page.getByText("Folashade Adeleke").first()).toBeVisible();

    await page.getByLabel(/Joyfully Accept/i).check();
    const countSelect = page.locator('select[name="attendingCount"]');
    await expect(countSelect).toBeVisible();
    await countSelect.selectOption("2");
    await page.locator('input[name="plusOneName"]').fill("Dr. Kunle Adeleke");
    await page.getByRole("button", { name: /submit rsvp response/i }).click();

    // Guest sees normal confirmation screen
    await expect(page.getByText(/RSVP Confirmed & Honoured/i)).toBeVisible({
      timeout: 10000,
    });

    // 35. Verify Overview Desk flags seating conflict on Next to Care For Card
    await page.goto(`/events/${eventId}`);
    await expect(page.getByText(/1 seating conflict/i)).toBeVisible();
    await expect(page.getByText(/Party size changed on RSVP/i)).toBeVisible();

    // 36. Verify Seating Desk lists Folashade as unseated with 'party size changed' badge
    await page.goto(`/events/${eventId}/seating`);
    await expect(page.getByText(/party size changed/i)).toBeVisible();

    // Resolve conflict by assigning Folashade to Family Table (capacity 8)
    const conflictedFolashadeSelect = page.locator(
      'select[aria-label="Assign Folashade Adeleke to a table"]'
    );
    const familyOptionVal = await conflictedFolashadeSelect
      .locator("option", { hasText: "Family Table" })
      .getAttribute("value");
    await conflictedFolashadeSelect.selectOption(familyOptionVal!);
    await expect(page.getByText(/Seating chart updated/i)).toBeVisible({
      timeout: 5000,
    });

    // 37. Check-in Desk: Navigate to check-in desk
    await page.goto(`/events/${eventId}/check-in`);
    await expect(
      page.getByText(/Check-In Desk & Reception Concierge/i)
    ).toBeVisible();

    // 38. Perform manual check-in using Babatunde's pass code
    expect(checkInCode).toBeTruthy();
    await page.locator('input[placeholder*="ARY-"]').fill(checkInCode!);
    await page.getByRole("button", { name: /admit guest/i }).click();

    // 39. Verify Admission Approved with table assignment
    await expect(page.getByText(/Admission Approved/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Babatunde Adeleke").first()).toBeVisible();
    await expect(page.getByText("VIP High Table").first()).toBeVisible();

    // 40. Verify telemetry count updated
    await expect(page.getByText(/Admitted Through Desk/i)).toBeVisible();
    await expect(page.getByText("Guests in celebration").first()).toBeVisible();
  });
});
