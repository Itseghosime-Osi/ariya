import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test.describe("My Events Bento Dashboard (/events) & Glass Navigation Shell", () => {
  test("empty, single-event, and populated states with event switcher, phone sheet, donut metrics, and Axe AA at 1440px and 390px", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await createAndLoginUser(page, context, "events_bento");

    // 1. Empty state (0 events)
    await page.goto("/events");
    await expect(page.locator("h1")).toHaveText("Your events");
    await expect(page.getByTestId("events-greeting")).toContainText(
      /Good (morning|afternoon|evening)/i
    );

    const emptyState = page.getByTestId("empty-events-state");
    await expect(emptyState).toBeVisible();
    await expect(
      emptyState.getByRole("heading", { name: /Plan your first àríyá/i })
    ).toBeVisible();
    await expect(page.getByTestId("empty-step-1")).toContainText(
      "Create event"
    );
    await expect(page.getByTestId("empty-step-2")).toContainText("Add guests");
    await expect(page.getByTestId("empty-step-3")).toContainText(
      "Send invitations"
    );

    // Sidebar shows Home + disabled "Create your first event" hint when 0 events
    const sidebar = page.getByTestId("desktop-sidebar");
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(page.getByTestId("event-switcher-empty")).toContainText(
      "Create your first event"
    );

    // Accessibility check on empty state (1440x900)
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
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    // 2. Single-event state (1 event)
    const event1 = await createTestEvent(page, {
      couple: "Ọlá & Adéṣọlá",
      title: "The Royal Nuptials of Ọlá & Adéṣọlá",
      venue: "Eko Convention Centre",
    });

    await page.goto("/events");
    await expect(page.locator("h1")).toHaveText("Your events");

    // Sidebar now shows EventSwitcher and all 11 event sections
    await expect(page.getByTestId("event-switcher-current-title")).toHaveText(
      event1.title
    );
    const sectionsContainer = page.getByTestId("sidebar-event-sections");
    await expect(sectionsContainer).toBeVisible();
    for (const sectionName of [
      "Overview",
      "Guests",
      "Invitations",
      "Reminders",
      "Seating",
      "Check-in",
      "Vendors",
      "Team",
      "Page editor",
      "Billing",
      "Settings",
    ]) {
      await expect(
        sectionsContainer.getByRole("link", { name: sectionName, exact: true })
      ).toBeVisible();
    }

    // Single-event tile shows Seating mini progress and hides All Events table (only 1 event)
    await expect(
      page.getByTestId(`upcoming-event-tile-${event1.eventId}`)
    ).toBeVisible();
    await expect(
      page.getByTestId("single-event-seating-progress")
    ).toContainText(/0 of 0 seated/i);
    await expect(page.getByTestId("all-events-card")).toHaveCount(0);
    await expect(page.getByTestId("events-search")).toHaveCount(0);

    // Donut numbers match metrics (0 attending, 0% accepted/awaiting/declined)
    await expect(page.getByTestId("donut-attending-count")).toContainText("0");
    await expect(page.getByTestId("donut-legend-accepted")).toContainText(
      "0 parties"
    );
    await expect(page.getByTestId("donut-legend-awaiting")).toContainText(
      "0 parties"
    );
    await expect(page.getByTestId("donut-legend-declined")).toContainText(
      "0 parties"
    );

    if (process.env.CAPTURE_SCREENSHOTS === "1") {
      await page.screenshot({
        path: "docs/screenshots/events-home-single-desktop.png",
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: "docs/screenshots/events-home-single-mobile.png",
      });
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    // 3. Populated state (4 events > 3 -> search visible, All events table visible)
    const event2 = await createTestEvent(page, {
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
    await expect(page.getByTestId("all-events-card")).toBeVisible();
    await expect(page.getByTestId("tab-upcoming")).toContainText(
      "Upcoming (4)"
    );
    await expect(page.getByTestId("tab-past")).toContainText("Past (0)");

    // Event switcher changes the sidebar links to the chosen event
    await page.getByTestId("event-switcher-trigger").click();
    await page.getByTestId(`event-switcher-option-${event2.eventId}`).click();
    await expect(page.getByTestId("event-switcher-current-title")).toHaveText(
      event2.title
    );
    await expect(
      sectionsContainer.getByRole("link", { name: "Guests", exact: true })
    ).toHaveAttribute("href", `/events/${event2.eventId}/guests`);

    // Search input (> 3 events) filters events diacritic-insensitively
    const searchBox = page.getByTestId("events-search");
    await expect(searchBox).toBeVisible();
    const searchInput = searchBox.locator("input");
    await searchInput.fill("Adesola");
    await expect(
      page.getByTestId(`upcoming-event-tile-${event1.eventId}`)
    ).toBeVisible();
    await searchInput.fill("");

    // 4. Axe WCAG 2.2 AA scan at 1440px (populated)
    const desktopAxe = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(desktopAxe.violations).toEqual([]);

    if (process.env.CAPTURE_SCREENSHOTS === "1") {
      await page.screenshot({
        path: "docs/screenshots/events-home-populated-desktop.png",
      });
    }

    // 5. Phone viewport (390x844): floating glass bottom bar with 4 items (Home, Guests, Check-in, More)
    await page.setViewportSize({ width: 390, height: 844 });
    const phoneBar = page.getByTestId("phone-tab-bar");
    await expect(phoneBar).toBeVisible();
    await expect(page.getByTestId("desktop-sidebar")).toBeHidden();
    await expect(page.getByTestId("floating-new-event")).toBeVisible();
    await expect(phoneBar.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(phoneBar.getByRole("link", { name: "Guests" })).toBeVisible();
    await expect(
      phoneBar.getByRole("link", { name: "Check-in" })
    ).toBeVisible();

    if (process.env.CAPTURE_SCREENSHOTS === "1") {
      await page.screenshot({
        path: "docs/screenshots/events-home-populated-mobile.png",
      });
    }

    // Axe WCAG 2.2 AA scan at 390px
    const mobileAxe = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(mobileAxe.violations).toEqual([]);

    // Clicking "More" opens the sheet with remaining sections and event switcher
    await page.getByTestId("phone-more-button").click();
    const moreSheet = page.getByTestId("phone-more-sheet");
    await expect(moreSheet).toBeVisible();
    await expect(
      page.getByTestId("phone-more-sections").getByRole("link", {
        name: "Seating",
      })
    ).toBeVisible();
  });
});
