import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

test.describe("Accessibility Audits (WCAG 2.1 AA via Axe)", () => {
  test("sign-in page has zero serious or critical violations", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(seriousOrCritical).toEqual([]);
  });

  test("celebration app pages and rsvp flow have zero serious or critical violations", async ({
    page,
    context,
  }) => {
    // One journey that signs up, creates an event and audits eight pages: on main it already used most of the
    // default 30 s on CI, so a slower runner tipped it over. Every check still runs.
    test.setTimeout(90_000);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await createAndLoginUser(page, context, "a11y_user");
    const { eventId } = await createTestEvent(page);

    // 1. Events Portfolio
    await page.goto("/events");
    let results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      )
    ).toEqual([]);

    // 2. Profile
    await page.goto("/profile");
    results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      )
    ).toEqual([]);

    // 3. Event Overview Desk
    await page.goto(`/events/${eventId}`);
    results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      )
    ).toEqual([]);

    // Contrast check on dark overview invitation tile
    const darkTileResults = await new AxeBuilder({ page })
      .include('[data-testid="invitation-card"]')
      .withRules(["color-contrast"])
      .analyze();
    expect(darkTileResults.violations).toEqual([]);

    // 4. Guest Registry
    await page.goto(`/events/${eventId}/guests`);
    results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      )
    ).toEqual([]);

    // Add a guest to get an RSVP token for the public rsvp page test
    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .locator('input[placeholder="Chief Olawale Adeyemi"]')
      .fill("Amina Bello");
    await page
      .locator('input[placeholder="olawale@example.com"]')
      .fill("amina@lagos.ng");
    await page
      .locator('input[placeholder="0803 123 4567"]')
      .fill("+2348031112233");
    await page.getByRole("button", { name: /add to guestbook/i }).click();
    await expect(page.getByText("Amina Bello").first()).toBeVisible({
      timeout: 5000,
    });

    // Open drawer to copy RSVP link
    await page.getByText("Amina Bello").first().click();
    await expect(page.getByText(/Guest Details/i)).toBeVisible();
    await page
      .getByRole("button", { name: /copy link/i })
      .first()
      .click();
    await expect(page.getByText(/Copied Link/i)).toBeVisible();
    const rsvpLink = await page.evaluate(() => navigator.clipboard.readText());
    await page.getByRole("button", { name: /close drawer/i }).click();

    // 5. RSVP Invitation Page
    await page.goto(rsvpLink);
    results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      )
    ).toEqual([]);

    // 6. Seating Desk
    await page.goto(`/events/${eventId}/seating`);
    results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      )
    ).toEqual([]);

    // 7. Billing Desk
    await page.goto(`/events/${eventId}/billing`);
    results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      )
    ).toEqual([]);

    // 8. Public Celebration Page & Confirm Your Attendance panel
    await page.goto(`/events/${eventId}/page-editor`);
    const publicSwitch = page.getByRole("switch", {
      name: /public event page/i,
    });
    if ((await publicSwitch.getAttribute("aria-checked")) !== "true") {
      await publicSwitch.click();
      await page.getByRole("button", { name: /save changes/i }).click();
      await expect(page.getByText(/updates saved successfully/i)).toBeVisible();
    }
    const publicUrl = await page
      .locator('a[href*="/e/"]')
      .first()
      .getAttribute("href");
    if (publicUrl) {
      await page.goto(publicUrl);
      await expect(page.getByText(/Confirm Your Attendance/i)).toBeVisible();
      const attendancePanelResults = await new AxeBuilder({ page })
        .include('[data-testid="attendance-panel"]')
        .withRules(["color-contrast"])
        .analyze();
      expect(attendancePanelResults.violations).toEqual([]);

      results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical"
        )
      ).toEqual([]);
    }
  });

  test("seating chart is keyboard-operable for seat assignment", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "a11y_keyboard_user");
    const { eventId } = await createTestEvent(page);

    // Add guest
    await page.goto(`/events/${eventId}/guests`);
    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .locator('input[placeholder="Chief Olawale Adeyemi"]')
      .fill("Seyi Makinde");
    await page
      .locator('input[placeholder="olawale@example.com"]')
      .fill("seyi@lagos.ng");
    await page
      .locator('input[placeholder="0803 123 4567"]')
      .fill("+2348037778899");
    await page.getByRole("button", { name: /add to guestbook/i }).click();
    await expect(page.getByText("Seyi Makinde").first()).toBeVisible({
      timeout: 5000,
    });

    // Go to seating and create table
    await page.goto(`/events/${eventId}/seating`);
    await page
      .getByRole("button", { name: /(create first table|new table)/i })
      .first()
      .click();
    await page
      .locator('input[placeholder*="Table 01"]')
      .fill("Dignitary Table");
    await page.locator('input[type="number"]').fill("4");
    await page.getByRole("button", { name: /create table/i }).click();
    await expect(page.getByText("Dignitary Table").first()).toBeVisible({
      timeout: 5000,
    });

    // Keyboard-only navigation: Seat opens the picker, then choose a table from the select.
    const seat = page.getByRole("button", { name: "Seat Seyi Makinde" });
    await seat.focus();
    await page.keyboard.press("Enter");
    const select = page.locator(
      'select[aria-label="Assign Seyi Makinde to a table"]'
    );
    await select.focus();
    await expect(select).toBeFocused();

    const tableOptionVal = await select
      .locator("option", { hasText: "Dignitary Table" })
      .getAttribute("value");
    await select.selectOption(tableOptionVal!);

    await expect(page.getByText(/Seating chart updated/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("the venue studio has no serious violations at 1440 and 390", async ({
    page,
    context,
  }) => {
    // Two viewports and a wasm load in one journey: the default 30 s is not enough on CI.
    test.setTimeout(90_000);
    await createAndLoginUser(page, context, "a11y_studio_user");
    const { eventId } = await createTestEvent(page);

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`/events/${eventId}/seating`);
      // Under `next dev` the studio chunk is compiled on first request; the default 5 s is not enough.
      await expect(page.getByTestId("hall-studio")).toBeVisible({
        timeout: 30_000,
      });

      // The panel is the part a screen reader reads; the canvas is decorative and hidden from it.
      const results = await new AxeBuilder({ page })
        .include('[data-testid="hall-studio"]')
        .analyze();
      expect(
        results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical"
        )
      ).toEqual([]);
    }
  });
});
