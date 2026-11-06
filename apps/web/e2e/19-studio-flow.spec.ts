import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

/**
 * 7.5 — the venue studio, end to end.
 *
 * One journey through the whole promise of the studio: pick a venue, lay the room out, compare
 * the engine's options, place an air conditioner, read what the room will feel like, then let the
 * plan generate the checklist and tick the first task off.
 *
 * The 3D hall is an iframe (`/hall3d/index.html`) driven by postMessage. Nothing here clicks
 * inside that canvas: the side panels and the toolbar are the stable surface, and they are the
 * same controls a keyboard user reaches. The hall is only waited for, so a failure is a real
 * failure rather than a race with three.js.
 *
 * Every step in the checklist is reachable today. The checklist itself is reached through the
 * app's own nav (`/events/<id>/checklist`), not from a button inside the studio — that is a
 * navigation, not a missing control.
 */
test.describe("Venue studio flow", () => {
  test("pick a venue, arrange, compare, cool, and generate the checklist", async ({
    page,
    context,
  }) => {
    // Sign-up, a full studio session and a checklist seed is well past the default 30 s on CI.
    test.setTimeout(180_000);
    await createAndLoginUser(page, context, "studio_flow");
    const { eventId } = await createTestEvent(page);

    await page.goto(`/events/${eventId}/seating`);
    await expect(page.getByTestId("hall-studio")).toBeVisible({
      timeout: 30_000,
    });
    // The hall is a separate page; wait for it to be mounted before trusting the panels.
    await expect(page.locator('iframe[title*="3D hall"]')).toBeAttached({
      timeout: 30_000,
    });

    // ---- 1. Pick a venue -------------------------------------------------
    // Simple mode is the venue picker (1.2.3): picture cards, not a dropdown.
    await page.getByRole("radio", { name: "Simple", exact: true }).click();
    const marquee = page.getByRole("radio", { name: /^Marquee/ });
    await expect(marquee).toBeVisible();
    await marquee.click();
    await expect(marquee).toHaveAttribute("aria-checked", "true");

    // Back to the full studio; both modes write the same document (7.2).
    await page.getByRole("radio", { name: "Full studio", exact: true }).click();
    await expect(page.getByTestId("hall-studio")).toBeVisible();

    // ---- 2. Auto-arrange ------------------------------------------------
    // A new event has no tables, so give the hall something to arrange first.
    await page.getByRole("tab", { name: /^Fit/ }).click();
    await page.getByLabel(/Set the number of tables/i).fill("8");
    const apply = page.getByRole("button", { name: "Apply", exact: true });
    await apply.click();
    // The button disables once the hall holds the number asked for.
    await expect(apply).toBeDisabled({ timeout: 20_000 });

    // The engine's three ranked options (2.4.1). The button only exists once the wasm is ready.
    const suggest = page.getByRole("button", {
      name: /Suggest three layouts/i,
    });
    await expect(suggest).toBeVisible({ timeout: 30_000 });
    await suggest.click();
    await expect(page.getByText(/^Option 1$/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/^Option 3$/)).toBeVisible();

    // ---- 3. Compare options ---------------------------------------------
    // Applying one option opens the current-vs-new comparison (2.4.4).
    await page
      .getByRole("button", { name: /Use this layout/i })
      .first()
      .click();
    const compare = page.getByRole("group", {
      name: /Compare the current and new layouts/i,
    });
    await expect(compare).toBeVisible({ timeout: 10_000 });

    await compare.getByRole("button", { name: "Current", exact: true }).click();
    await expect(
      compare.getByRole("button", { name: "Current", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await compare.getByRole("button", { name: "New", exact: true }).click();
    await expect(
      compare.getByRole("button", { name: "New", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await compare.getByRole("button", { name: /Keep this/i }).click();
    await expect(compare).toHaveCount(0);

    // ---- 4. Place an AC unit --------------------------------------------
    // "Add one" is the keyboard path to the same thing a floor click does (3.2.2).
    await page.getByRole("tab", { name: /^Cooling/ }).click();
    // The studio shell is a <section> too, so anchor on the inner one that owns the heading.
    const verdict = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "The verdict" }) })
      .last();
    await expect(verdict).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Add one", exact: true }).click();
    await expect(page.getByText(/^Unit 1 ·/)).toBeVisible({ timeout: 10_000 });

    // ---- 5. Read the temperature verdict --------------------------------
    // The engine writes the headline and the reasons; the deck leads with them (3.3.1).
    const verdictText = (await verdict.innerText()).trim();
    expect(verdictText.length).toBeGreaterThan(20);
    expect(verdictText).toMatch(/°C|temperature|cool|humid|damp|viable/i);

    // The layout is saved on a short debounce; let it land before the checklist reads it.
    await page.waitForTimeout(1_500);

    // ---- 6. Generate the checklist --------------------------------------
    // The checklist is a view over the plan (6.3.8): it seeds itself from the hall on first run.
    await page.goto(`/events/${eventId}/checklist`);
    const build = page.getByRole("button", { name: /Build the checklist/i });
    let firstTick = page.getByRole("checkbox", { name: /^Tick / }).first();
    await expect(build.or(firstTick)).toBeVisible({ timeout: 30_000 });
    // The button stays disabled until the hall plan has loaded and the engine is ready, so a click
    // straight after navigation is silently dropped. Seeding twice is safe: the action only inserts
    // rows the caller's reconciliation says are missing.
    for (let attempt = 0; attempt < 10; attempt++) {
      if ((await build.count()) === 0) break;
      if (await build.isEnabled()) await build.click();
      try {
        await expect(firstTick).toBeVisible({ timeout: 3_000 });
        break;
      } catch {
        // Not seeded yet: the plan had not loaded, or the click landed before the action was ready.
      }
    }
    await expect(firstTick).toBeVisible({ timeout: 30_000 });

    // ---- 7. Tick a task -------------------------------------------------
    // The tick is optimistic, but the row can re-key while the phase re-renders and swallow the
    // click. Retry the click itself, so a dropped click costs a retry rather than a 10 s wait.
    await expect(async () => {
      // Idempotent: if the first attempt did land, ticking again would undo it.
      if (await firstTick.isVisible()) await firstTick.click();
      const untick = page.getByRole("checkbox", { name: /^Un-tick / }).first();
      await expect(untick).toBeVisible({ timeout: 2_000 });
      firstTick = untick;
    }).toPass({ timeout: 30_000 });
    await expect(page.getByText(/Marked done/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
