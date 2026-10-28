import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

test.describe("Persistent app shell (shared layout)", () => {
  test("sidebar and phone dock survive navigation instead of remounting", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await createAndLoginUser(page, context, "shell_keeper");
    const { eventId } = await createTestEvent(page);

    await page.goto(`/events/${eventId}`);
    const sidebar = page.getByTestId("desktop-sidebar");
    await expect(sidebar).toBeVisible();

    // Fold the sidebar, then tag its DOM node so a remount would lose the tag.
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");
    await sidebar.evaluate((el) => el.setAttribute("data-kept", "yes"));

    // Client-side navigation through the sidebar's own links.
    await sidebar.getByRole("link", { name: "Guests", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/events/${eventId}/guests$`));
    await expect(sidebar).toHaveAttribute("data-kept", "yes");
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");

    // Pages that used to render without any shell now keep it too.
    await sidebar.getByRole("link", { name: "Team", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/events/${eventId}/team$`));
    await expect(sidebar).toHaveAttribute("data-kept", "yes");

    // Phone: the dock persists and its capsule follows the active tab.
    await page.setViewportSize({ width: 390, height: 844 });
    const dock = page.getByTestId("phone-tab-bar");
    await expect(dock).toBeVisible();
    await dock.evaluate((el) => el.setAttribute("data-kept", "yes"));
    await dock.getByRole("link", { name: "Guests" }).click();
    await expect(page).toHaveURL(new RegExp(`/events/${eventId}/guests$`));
    await expect(dock).toHaveAttribute("data-kept", "yes");
    await expect(dock.getByRole("link", { name: "Guests" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    // The printable seating chart stays outside the shell.
    await page.goto(`/events/${eventId}/seating/print`);
    await expect(page.getByTestId("phone-tab-bar")).toHaveCount(0);
    await expect(page.getByTestId("desktop-sidebar")).toHaveCount(0);
  });
});
