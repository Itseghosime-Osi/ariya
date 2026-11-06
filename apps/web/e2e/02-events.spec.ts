import { test, expect } from "@playwright/test";
import {
  createAndLoginUser,
  createTestEvent,
  enablePublicPage,
  pickDateTime,
} from "./fixtures/test-helpers";

test.describe("Events Creation & Overview", () => {
  test("create event wizard, desk metrics, milestones, and public page publishing", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "event_host");

    // Create event via wizard
    const { eventId, title } = await createTestEvent(page);

    // Verify on overview desk
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(page.getByText(/Celebration Desk/i).first()).toBeVisible();
    await expect(page.getByText(/Every yes, together/i).first()).toBeVisible();

    // Verify public page unpublished initially
    await page.goto(`/events/${eventId}/page-editor`);
    await expect(
      page.getByRole("heading", { name: /page editor/i })
    ).toBeVisible();

    const publicPageLink = page.getByRole("link", {
      name: /view public page/i,
    });
    const publicHref = await publicPageLink.getAttribute("href");
    expect(publicHref).toContain("/e/");

    await page.goto(publicHref!);
    await expect(page.getByText(/Celebration Unavailable/i)).toBeVisible();

    // Enable public discovery in Page Editor
    await page.goto(`/events/${eventId}/page-editor`);
    await enablePublicPage(page);
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/updates saved successfully/i)).toBeVisible({
      timeout: 10000,
    });

    // Public page now renders
    await page.goto(publicHref!);
    await expect(page.getByText(title).first()).toBeVisible();
  });

  test("settings route (/events/[eventId]/settings): edit and save details, archive with confirmation", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "event_host_settings");
    const { eventId, title } = await createTestEvent(page);

    // Navigate to /events/[eventId]/settings
    await page.goto(`/events/${eventId}/settings`);
    await expect(page.locator("h1")).toContainText(/Celebration Settings/i);

    // Verify current title and details
    const titleInput = page.locator('input[value="' + title + '"]');
    await expect(titleInput).toBeVisible();

    // Edit and save details
    const updatedTitle = `${title} Ceremonial Edition`;
    await titleInput.fill(updatedTitle);
    await page.getByRole("button", { name: /save settings/i }).click();

    await expect(page.getByText(/settings saved successfully/i)).toBeVisible({
      timeout: 10000,
    });

    // Open Archive Confirmation Modal (it lives under the Danger zone tab)
    await page.getByRole("tab", { name: /danger zone/i }).click();
    await page.getByRole("button", { name: /archive event/i }).click();
    await expect(page.getByText(/Archive Celebration\?/i)).toBeVisible();

    // Confirm archive
    await page.getByRole("button", { name: /confirm archive/i }).click();

    // Verify redirected to /events and celebration is archived
    await page.waitForURL(/\/events$/, { timeout: 10000 });
    await expect(page.locator("h1")).toContainText(/Your events/i);
  });

  test("public event page does not crash with non-bucket cover image", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "event_host_cover");
    const { eventId, title } = await createTestEvent(page);

    // Publish event
    await page.goto(`/events/${eventId}/page-editor`);
    await enablePublicPage(page);
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/updates saved successfully/i)).toBeVisible({
      timeout: 10000,
    });

    const publicPageLink = page.getByRole("link", {
      name: /view public page/i,
    });
    const publicHref = await publicPageLink.getAttribute("href");

    // Visit public page - should render 200 without throwing image host error
    const res = await page.goto(publicHref!);
    expect(res?.status()).toBe(200);
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(page.getByText(/Invitation/i).first()).toBeVisible();
  });

  for (const tz of ["UTC", "America/New_York"] as const) {
    test(`page editor preserves exact WAT datetime across save and reload in ${tz} timezone`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ timezoneId: tz });
      const page = await context.newPage();

      try {
        await createAndLoginUser(
          page,
          context,
          `wat_tz_${tz.toLowerCase().replace(/[^a-z0-9]/g, "_")}`
        );
        const { eventId } = await createTestEvent(page);

        await page.goto(`/events/${eventId}/page-editor`);
        await expect(
          page.getByRole("heading", { name: /page editor/i })
        ).toBeVisible();

        // Enable public access so we can view /e/[slug]
        await enablePublicPage(page);

        // Choose the ceremony (14:00 WAT) and the RSVP deadline in our pickers
        await pickDateTime(page, "editor-date", "2026-12-12T14:00");
        await pickDateTime(page, "editor-rsvp-by", "2026-12-01T14:00");

        // Save changes
        await page.getByRole("button", { name: /save changes/i }).click();
        await expect(page.getByText(/updates saved successfully/i)).toBeVisible(
          {
            timeout: 10000,
          }
        );

        // Reload page and verify inputs preserve exact WAT values
        await page.reload();
        await expect(page.locator("#editor-date")).toContainText(
          "Sat 12 Dec 2026, 2:00 PM"
        );
        await expect(page.locator("#editor-rsvp-by")).toContainText(
          "Tue 1 Dec 2026, 2:00 PM"
        );

        // Verify public page displays 2:00 PM WAT
        const publicPageLink = page.getByRole("link", {
          name: /view public page/i,
        });
        const publicHref = await publicPageLink.getAttribute("href");
        await page.goto(publicHref!);
        await expect(page.getByText(/2:00 PM WAT/i).first()).toBeVisible({
          timeout: 10000,
        });
      } finally {
        await context.close();
      }
    });
  }

  test("page editor date picker updates the preview to 2:00 PM WAT before saving", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "en-US" });
    const page = await context.newPage();
    try {
      await createAndLoginUser(page, context, "picker_user");
      const { eventId } = await createTestEvent(page);

      await page.goto(`/events/${eventId}/page-editor`);
      await expect(
        page.getByRole("heading", { name: /page editor/i })
      ).toBeVisible();

      // A date that is always in the future, whatever day this runs.
      const year = new Date().getFullYear() + 1;

      await pickDateTime(page, "editor-date", `${year}-12-12T15:00`);
      await expect(page.getByText(/3:00 PM WAT/i).first()).toBeVisible();

      // Change the hour in the open picker: the preview follows before saving.
      await page.locator("#editor-date").click();
      await page
        .getByRole("button", { name: "2 o'clock", exact: true })
        .click();
      await expect(page.getByText(/2:00 PM WAT/i).first()).toBeVisible();
      await page.getByRole("button", { name: "Done" }).click();

      await page.getByRole("button", { name: /save changes/i }).click();
      await expect(page.getByText(/updates saved successfully/i)).toBeVisible({
        timeout: 10000,
      });

      await page.reload();
      await expect(page.locator("#editor-date")).toContainText(
        `12 Dec ${year}, 2:00 PM`
      );
    } finally {
      await context.close();
    }
  });

  test("upload cover as owner, open public page signed out, and assert image loads HTTP 200", async ({
    browser,
  }) => {
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    try {
      await createAndLoginUser(ownerPage, ownerContext, "cover_owner_user");
      const { eventId, title } = await createTestEvent(ownerPage);

      await ownerPage.goto(`/events/${eventId}/page-editor`);
      await expect(
        ownerPage.getByRole("heading", { name: /page editor/i })
      ).toBeVisible();

      // Ensure public event discovery is checked
      await enablePublicPage(ownerPage);

      // Upload a valid 1x1 PNG cover image
      const fileInput = ownerPage.locator(
        'input[type="file"][accept*="image"]'
      );
      const pngBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );
      await fileInput.setInputFiles({
        name: "test-cover.png",
        mimeType: "image/png",
        buffer: pngBuffer,
      });

      // Confirm upload succeeded
      await expect(ownerPage.getByText(/Cover Banner Uploaded/i)).toBeVisible({
        timeout: 10000,
      });

      // Save changes
      await ownerPage.getByRole("button", { name: /save changes/i }).click();
      await expect(
        ownerPage.getByText(/updates saved successfully/i)
      ).toBeVisible({ timeout: 10000 });

      const publicPageLink = ownerPage.getByRole("link", {
        name: /view public page/i,
      });
      const publicHref = await publicPageLink.getAttribute("href");
      expect(publicHref).toBeTruthy();

      // Open public page in an independent, signed-out browser context
      const guestContext = await browser.newContext();
      const guestPage = await guestContext.newPage();
      try {
        const res = await guestPage.goto(publicHref!);
        expect(res?.status()).toBe(200);
        await expect(guestPage.getByText(title).first()).toBeVisible();

        // Locate cover image on public page
        const coverImg = guestPage.locator(`img[alt="${title}"]`);
        await expect(coverImg).toBeVisible({ timeout: 10000 });

        // Retrieve the rendered image source
        const src = await coverImg.getAttribute("src");
        expect(src).toBeTruthy();

        // Request the optimized image directly from the public guest context (HTTP 200)
        const imgResponse = await guestPage.request.get(src!);
        expect(imgResponse.status()).toBe(200);

        // Also verify the raw public storage object URL loads with HTTP 200 without auth
        const rawStorageUrl = new URL(
          src!,
          "http://localhost:3000"
        ).searchParams.get("url");
        if (rawStorageUrl) {
          const rawResponse = await guestPage.request.get(rawStorageUrl);
          expect(rawResponse.status()).toBe(200);
        }
      } finally {
        await guestContext.close();
      }
    } finally {
      await ownerContext.close();
    }
  });
});

test.describe("Unpublished public page", () => {
  test("Go back returns to the page the host came from, not the home page", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "goback_host");
    const { eventId } = await createTestEvent(page);

    await page.goto(`/events/${eventId}/page-editor`);
    const [tab] = await Promise.all([
      context.waitForEvent("page"),
      page
        .getByRole("link", { name: /view public page/i })
        .first()
        .click(),
    ]);
    await expect(tab.getByText(/Celebration Unavailable/i)).toBeVisible();

    await tab.getByRole("button", { name: /go back/i }).click();
    await expect(tab).toHaveURL(new RegExp(`/events/${eventId}/page-editor`));

    // Arriving by a pasted link has no page to return to, so it offers the home page.
    const fresh = await context.newPage();
    await fresh.goto(`/e/${(await page.url()).split("/").pop() ?? "x"}-none`);
    await expect(fresh.getByText(/Celebration Unavailable/i)).toBeVisible();
    await expect(
      fresh.getByRole("button", { name: /return to àríyá/i })
    ).toBeVisible();
  });
});
