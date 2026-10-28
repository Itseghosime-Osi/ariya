import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test.describe("My Events Home (/events) & Liquid Glass Navigation Shell", () => {
  test("empty state (0 events), populated state, search threshold (<=3 vs >3), and navigation at 1280x800 and 390x844", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await createAndLoginUser(page, context, "events_home");

    // 1. Empty state (0 events)
    await page.goto("/events");
    await expect(page.locator("h1")).toHaveText("Your events");
    await expect(page.getByTestId("events-greeting")).toContainText(
      /Good (morning|afternoon|evening)/i
    );
    const emptyState = page.getByTestId("events-empty-state");
    await expect(emptyState).toBeVisible();
    await expect(
      emptyState.getByRole("heading", { name: /Plan your first celebration/i })
    ).toBeVisible();
    const emptyCta = emptyState.getByRole("link", {
      name: /Create your first event/i,
    });
    await expect(emptyCta).toHaveAttribute("href", "/events/new");

    // Accessibility check on empty state (1280x800)
    const emptyAxe = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(emptyAxe.violations).toEqual([]);

    if (process.env.CAPTURE_SCREENSHOTS === "1") {
      await page.screenshot({
        path: "docs/screenshots/events-home-empty-desktop.png",
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: "docs/screenshots/events-home-empty-mobile.png",
      });
      await page.setViewportSize({ width: 1280, height: 800 });
    }

    // 2. Create 1st event -> populated state (<= 3 events -> search hidden)
    const event1 = await createTestEvent(page, {
      couple: "Ọlá & Adéṣọlá",
      title: "The Royal Nuptials of Ọlá & Adéṣọlá",
      venue: "Eko Convention Centre",
    });

    await page.goto("/events");
    await expect(page.locator("h1")).toHaveText("Your events");
    await expect(page.getByTestId("tab-upcoming")).toContainText(
      "Upcoming (1)"
    );
    await expect(page.getByTestId("tab-past")).toContainText("Past (0)");

    // Search must be hidden with <= 3 events
    await expect(page.getByTestId("events-search")).toHaveCount(0);

    // Hero card assertions: WAT date + countdown + RSVP breakdown + Open event CTA
    const heroCard = page.getByTestId("hero-event-card");
    await expect(heroCard).toBeVisible();
    await expect(heroCard).toContainText(event1.title);
    await expect(heroCard).toContainText(/WAT/);
    await expect(page.getByTestId("hero-rsvp-panel")).toBeVisible();
    await expect(page.getByTestId("hero-rsvp-panel")).toContainText(
      /people attending|person attending/i
    );

    // Coming up section visible
    await expect(page.getByTestId("coming-up-section")).toBeVisible();

    // Clicking "Open event" navigates to /events/<id>
    await heroCard.getByRole("link", { name: /^Open event$/i }).click();
    await expect(page).toHaveURL(new RegExp(`/events/${event1.eventId}$`));

    // 3. Create 3 more events (total 4 > 3) to trigger search threshold
    await createTestEvent(page, {
      couple: "Chidinma & Obinna",
      title: "Chidinma & Obinna Traditional Engagement",
      venue: "Landmark Centre",
    });
    await createTestEvent(page, {
      couple: "Bolanle & Segun",
      title: "Bolanle & Segun White Wedding",
      venue: "Civic Centre",
    });
    await createTestEvent(page, {
      couple: "Zainab & Ibrahim",
      title: "Zainab & Ibrahim Walimah",
      venue: "Federal Palace Hotel",
    });

    await page.goto("/events");
    await expect(page.getByTestId("tab-upcoming")).toContainText(
      "Upcoming (4)"
    );

    // Search input is now visible (> 3 events)
    const searchBox = page.getByTestId("events-search");
    await expect(searchBox).toBeVisible();
    const searchInput = searchBox.locator("input");

    // Live diacritic-insensitive filtering ("Adesola" matches "Adéṣọlá")
    await searchInput.fill("Adesola");
    await expect(page.getByTestId("hero-event-card")).toContainText(
      "Ọlá & Adéṣọlá"
    );
    await expect(page.getByTestId("event-card")).toHaveCount(0);

    // No-match shows "Clear search" and resets
    await searchInput.fill("Nonexistent Venue XYZ");
    const noResults = page.getByTestId("events-no-results");
    await expect(noResults).toBeVisible();
    await expect(noResults).toContainText(
      'No events match "Nonexistent Venue XYZ"'
    );
    await noResults.getByRole("button", { name: /Clear search/i }).click();
    await expect(searchInput).toHaveValue("");
    await expect(page.getByTestId("hero-event-card")).toBeVisible();

    // 4. Accessibility scan at 1280x800 (populated)
    const desktopAxe = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(desktopAxe.violations).toEqual([]);

    if (process.env.CAPTURE_SCREENSHOTS === "1") {
      await page.screenshot({
        path: "docs/screenshots/events-home-populated-desktop.png",
      });
    }

    // 5. Phone viewport (390x844): bottom glass tab bar visible, desktop sidebar hidden,
    //    floating "New event" button visible, zero horizontal scroll, and Axe scan clean
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("phone-tab-bar")).toBeVisible();
    await expect(page.getByTestId("desktop-sidebar")).toBeHidden();
    await expect(page.getByTestId("floating-new-event")).toBeVisible();

    if (process.env.CAPTURE_SCREENSHOTS === "1") {
      await page.screenshot({
        path: "docs/screenshots/events-home-populated-mobile.png",
      });
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);

    const mobileAxe = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(mobileAxe.violations).toEqual([]);

    // 6. Reduced motion: page renders cleanly
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await expect(page.locator("h1")).toHaveText("Your events");
    await expect(page.getByTestId("hero-event-card")).toBeVisible();
  });
});
