import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

/**
 * The seating page is a full-screen workspace: no sidebar or top bar, one Back button, a layers
 * panel whose rows can be renamed, a table list that seats guests, and a Simple panel that sits
 * beside the live hall.
 */
test.describe("Seating workspace", () => {
  test("is full screen with a way back, renamable layers, a seating list and a live Simple panel", async ({
    page,
    context,
  }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await createAndLoginUser(page, context, "ws_host");
    const { eventId } = await createTestEvent(page);

    // A guest to seat.
    await page.goto(`/events/${eventId}/guests`);
    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .locator('input[placeholder="Chief Olawale Adeyemi"]')
      .fill("Ada Lovelace");
    await page
      .locator('input[placeholder="olawale@example.com"]')
      .fill("ada@lagos.ng");
    await page
      .locator('input[placeholder="0803 123 4567"]')
      .fill("+2348021119999");
    await page.getByRole("button", { name: /add to guestbook/i }).click();
    await expect(page.getByText("Ada Lovelace").first()).toBeVisible({
      timeout: 5000,
    });

    await page.goto(`/events/${eventId}/seating`);
    await expect(page.getByTestId("hall-studio")).toBeVisible({
      timeout: 30_000,
    });

    // The app's own chrome steps aside; the only way out is the Back button.
    await expect(page.getByTestId("desktop-sidebar")).toHaveCount(0);
    await expect(page.getByTestId("phone-tab-bar")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /Seating & Floor Plan/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to the event" })
    ).toHaveAttribute("href", `/events/${eventId}`);

    // Add a table from the always-there New table button.
    await page
      .getByRole("button", { name: /^New table$/i })
      .first()
      .click();
    await page.locator('input[placeholder*="Table 01"]').fill("Head table");
    await page.locator('input[type="number"]').fill("4");
    await page.getByRole("button", { name: /create table/i }).click();

    // Layers: the table is a layer, and a layer can be renamed from its pencil.
    const dock = page.getByTestId("left-dock");
    await expect(dock).toBeVisible();
    await dock.getByRole("button", { name: /^Rename Head table/ }).click();
    const name = dock.getByRole("textbox", { name: /^Name of Head table/ });
    await name.fill("Bride’s table");
    await name.press("Enter");
    await expect(
      dock.getByRole("button", { name: /^Bride’s table/ })
    ).toBeVisible({ timeout: 10_000 });

    // The areas are layers too, and renaming one shows in its inspector.
    await dock.getByRole("button", { name: /^Rename Stage/ }).click();
    const stage = dock.getByRole("textbox", { name: /^Name of Stage/ });
    await stage.fill("Main stage");
    await stage.press("Enter");
    await dock.getByRole("button", { name: /^Main stage/ }).click();
    await expect(
      page.getByTestId("hall-inspector").getByText("Main stage").first()
    ).toBeVisible();

    // Tables: open the table and seat the waiting guest from the list.
    await dock.getByRole("tab", { name: /^Tables/ }).click();
    await dock.getByRole("button", { name: /^Bride’s table/ }).click();
    await dock
      .getByLabel("Seat a guest at Bride’s table")
      .selectOption({ label: "Ada Lovelace" });
    await expect(page.getByText(/Seating chart updated/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(dock.getByText(/^1\/4$/)).toBeVisible();

    // Simple: the questions sit beside the hall, which stays on screen and keeps its tools off.
    await page.getByRole("radio", { name: "Simple", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: /Tell us about the day/i })
    ).toBeVisible();
    await expect(page.locator('iframe[title*="3D hall"]')).toBeVisible();
    await expect(page.getByTestId("left-dock")).toHaveCount(0);
    await page.getByRole("radio", { name: /^Marquee/ }).click();
    await expect(page.getByRole("radio", { name: /^Marquee/ })).toBeChecked();
    await page.getByRole("radio", { name: "Full studio", exact: true }).click();
    await expect(page.getByTestId("left-dock")).toBeVisible();

    // Back returns to the event, with the app's navigation back around it.
    await page.getByRole("link", { name: "Back to the event" }).click();
    await expect(page).toHaveURL(new RegExp(`/events/${eventId}$`));
    await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
  });
});
