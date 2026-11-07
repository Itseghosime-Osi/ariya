import { test, expect, type Page } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

interface Seen {
  drawn: {
    tables: number;
    zones: { id: string; visible: boolean }[];
  };
  locked: string[];
}

/** Ask the hall what it is really drawing and what it holds locked (see the hall's inspect command). */
async function inspect(page: Page): Promise<Seen> {
  return page.evaluate(
    () =>
      new Promise<Seen>((resolve, reject) => {
        const frame = document.querySelector<HTMLIFrameElement>(
          "iframe[src*='hall3d']"
        );
        const timer = setTimeout(() => reject(new Error("no answer")), 5000);
        const listen = (e: MessageEvent) => {
          if (e.data?.source !== "ariya-hall3d" || e.data.t !== "inspect")
            return;
          clearTimeout(timer);
          window.removeEventListener("message", listen);
          resolve(e.data as Seen);
        };
        window.addEventListener("message", listen);
        frame!.contentWindow!.postMessage(
          { source: "ariya-studio", t: "cmd", cmd: "inspect", points: [] },
          window.location.origin
        );
      })
  );
}

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
      page.getByRole("link", { name: "Back", exact: true })
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

    // Back returns to the page the person came from (the guest list, here), with the app's
    // navigation back around it.
    await page.getByRole("link", { name: "Back", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/events/${eventId}/guests$`));
    await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
  });

  test("Back goes to the event overview when there is no earlier page to return to", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await createAndLoginUser(page, context, "ws_back");
    const { eventId } = await createTestEvent(page);

    // A fresh tab opened straight on the studio, as a pasted link would be.
    const tab = await context.newPage();
    await tab.setViewportSize({ width: 1440, height: 900 });
    await tab.goto(`/events/${eventId}/seating`);
    await expect(tab.getByTestId("hall-studio")).toBeVisible({
      timeout: 30_000,
    });
    await tab.getByRole("link", { name: "Back", exact: true }).click();
    await expect(tab).toHaveURL(new RegExp(`/events/${eventId}$`));
    await expect(tab.getByTestId("desktop-sidebar")).toBeVisible();
  });

  test("layers can be hidden, locked and reordered, and the interface can go dark", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await createAndLoginUser(page, context, "ws_layers");
    const { eventId } = await createTestEvent(page);
    await page.goto(`/events/${eventId}/seating`);
    await expect(page.getByTestId("hall-studio")).toBeVisible({
      timeout: 30_000,
    });
    const dock = page.getByTestId("left-dock");
    // The dock opens once the page has hydrated, which under `next dev` can take a while.
    await expect(dock).toBeVisible({ timeout: 30_000 });

    // Two tables to work with.
    for (const name of ["Alpha", "Bravo"]) {
      await page
        .getByRole("button", { name: /^New table$/i })
        .first()
        .click();
      await page.locator('input[placeholder*="Table 01"]').fill(name);
      await page.locator('input[type="number"]').fill("4");
      await page.getByRole("button", { name: /create table/i }).click();
      await expect(
        dock.getByRole("button", { name: new RegExp(`^${name}`) }).first()
      ).toBeVisible({ timeout: 10_000 });
    }
    await expect
      .poll(async () => (await inspect(page)).drawn.tables, { timeout: 15_000 })
      .toBe(2);

    // Hide: the hall really draws one table fewer, and the row says so. Show brings it back.
    await dock.getByRole("button", { name: "Hide Alpha" }).click();
    await expect
      .poll(async () => (await inspect(page)).drawn.tables, { timeout: 10_000 })
      .toBe(1);
    await expect(dock.getByText("Hidden", { exact: true })).toBeVisible();
    await dock.getByRole("button", { name: "Show Alpha" }).click();
    await expect
      .poll(async () => (await inspect(page)).drawn.tables, { timeout: 10_000 })
      .toBe(2);

    // Hiding an area takes it out of the picture too.
    await dock.getByRole("button", { name: /^Hide Stage/ }).click();
    await expect
      .poll(
        async () =>
          (await inspect(page)).drawn.zones.filter((z) => !z.visible).length,
        { timeout: 10_000 }
      )
      .toBe(1);
    await dock.getByRole("button", { name: /^Show Stage/ }).click();

    // Lock: the hall holds it locked, and unlocking lets go.
    await dock.getByRole("button", { name: "Lock Alpha" }).click();
    await expect
      .poll(async () => (await inspect(page)).locked.length, {
        timeout: 10_000,
      })
      .toBe(1);
    await dock.getByRole("button", { name: "Unlock Alpha" }).click();
    await expect
      .poll(async () => (await inspect(page)).locked.length, {
        timeout: 10_000,
      })
      .toBe(0);

    // Reorder: dragging a row onto another swaps them, and Alt with an arrow moves it back.
    const order = () =>
      dock
        .locator("section[aria-label='Tables'] [data-layer-row]")
        .evaluateAll((els) =>
          els.map((e) => (e.textContent ?? "").trim().slice(0, 5))
        );
    expect(await order()).toEqual(["Alpha", "Bravo"]);
    await dock
      .getByRole("button", { name: /^Bravo/ })
      .first()
      .dragTo(dock.getByRole("button", { name: /^Alpha/ }).first());
    await expect.poll(order).toEqual(["Bravo", "Alpha"]);
    await dock
      .getByRole("button", { name: /^Bravo/ })
      .first()
      .focus();
    await page.keyboard.press("Alt+ArrowDown");
    await expect.poll(order).toEqual(["Alpha", "Bravo"]);

    // It is all saved with the plan: hide one, reload, and it is still hidden.
    await dock.getByRole("button", { name: "Hide Bravo" }).click();
    await page.waitForTimeout(2500);
    await page.reload();
    await expect(page.getByTestId("left-dock")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: "Show Bravo" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Show Bravo" }).click();

    // Dark interface: the whole studio switches, and it is remembered.
    await page.getByRole("button", { name: "Dark interface" }).click();
    await expect(page.locator("section.studio-dark")).toBeVisible();
    await page.reload();
    await expect(page.locator("section.studio-dark")).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: "Light interface" }).click();
    await expect(page.locator("section.studio-dark")).toHaveCount(0);
  });
});
