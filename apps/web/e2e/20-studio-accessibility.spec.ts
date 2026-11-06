import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  createAndLoginUser,
  createTestEvent,
  waitForAnimationsToSettle,
} from "./fixtures/test-helpers";

/**
 * 7.4 — the accessibility pass over the new surfaces: the seating studio, Simple mode, the
 * checklist and the day-of run sheet.
 *
 * Four things are checked, because axe alone does not cover them:
 *   1. axe (WCAG 2.1/2.2 AA) at 1440 and at 390, on every new surface.
 *   2. 44 px touch targets on the controls the studio flow actually uses.
 *   3. a keyboard path for the drag interactions (a table can be moved from the inspector).
 *   4. reduced motion and 200 % zoom.
 *
 * The studio is desktop-only by design (`SeatingDesk` swaps it for the table list below 768 px),
 * so the 390 px pass audits the table list a phone really gets, not a studio that is not there.
 */

const SERIOUS = new Set(["serious", "critical"]);

async function audit(page: Page, label: string) {
  await waitForAnimationsToSettle(page);
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter((v) => SERIOUS.has(v.impact ?? ""));
  expect(
    bad.map((v) => `${v.id} (${v.nodes.length} node(s))`),
    `${label} has serious or critical axe violations`
  ).toEqual([]);
}

/** Every element the locator matches must be at least `min` px in both directions. */
async function expectTargets(locator: Locator, min = 44) {
  await expect(locator.first()).toBeVisible();
  const sizes = await locator.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        label:
          el.getAttribute("aria-label") ||
          (el.textContent ?? "").trim().slice(0, 40) ||
          el.tagName.toLowerCase(),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    })
  );
  const small = sizes.filter((s) => s.w < min || s.h < min);
  expect(small, `targets under ${min}px`).toEqual([]);
}

/** Sign in, make an event, and give the hall six tables so the studio has something to show. */
async function studioWithTables(
  page: Page,
  context: Parameters<typeof createAndLoginUser>[1]
) {
  await createAndLoginUser(page, context, "a11y_studio");
  const { eventId } = await createTestEvent(page);
  await page.goto(`/events/${eventId}/seating`);
  await expect(page.getByTestId("hall-studio")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("tab", { name: /^Fit/ }).click();
  await page.getByLabel(/Set the number of tables/i).fill("6");
  const apply = page.getByRole("button", { name: "Apply", exact: true });
  await apply.click();
  // Wait for the tables to land, not just for the button to grey out: the create is a server
  // action, and leaving before it returns means nothing was there to save.
  await expect(
    page.getByText(/\d+ tables? added to the hall\./).first()
  ).toBeVisible({ timeout: 20_000 });
  await expect(apply).toBeDisabled({ timeout: 20_000 });
  return eventId;
}

/** Seed the checklist from the plan, whether it seeds itself or waits for the button. */
async function openChecklist(page: Page, eventId: string) {
  await page.goto(`/events/${eventId}/checklist`);
  const build = page.getByRole("button", { name: /Build the checklist/i });
  const firstTick = page.getByRole("checkbox", { name: /^Tick / }).first();
  await expect(build.or(firstTick)).toBeVisible({ timeout: 30_000 });
  // The button is disabled until the hall plan has loaded and the engine is ready, so a click
  // straight after navigation is silently dropped. Seeding twice is safe: the action only inserts
  // rows the caller's reconciliation says are missing.
  for (let attempt = 0; attempt < 10; attempt++) {
    if ((await build.count()) === 0) break;
    if (await build.isEnabled()) await build.click();
    try {
      await expect(firstTick).toBeVisible({ timeout: 3_000 });
      return;
    } catch {
      // Not seeded yet: the plan had not loaded, or the click landed before the action was ready.
    }
  }
  await expect(firstTick).toBeVisible({ timeout: 30_000 });
}

test.describe("Studio accessibility", () => {
  test("the studio, Simple mode, the checklist and the run sheet pass axe at 1440", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const eventId = await studioWithTables(page, context);

    await audit(page, "studio (full)");

    await page.getByRole("radio", { name: "Simple", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: /Tell us about the day/i })
    ).toBeVisible();
    await audit(page, "studio (simple)");

    await page.getByRole("radio", { name: "Full studio", exact: true }).click();

    await openChecklist(page, eventId);
    await audit(page, "checklist");

    await page.goto(`/events/${eventId}/day-of`);
    await expect(
      page.getByText(/Run sheet|Nothing is scheduled for the day/i).first()
    ).toBeVisible({ timeout: 15_000 });
    await audit(page, "run sheet");
  });

  test("the seating page, the checklist and the run sheet pass axe at 390", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    // Build the plan at desktop width, then audit what a phone is actually given.
    await page.setViewportSize({ width: 1440, height: 900 });
    const eventId = await studioWithTables(page, context);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/events/${eventId}/seating`);
    await expect(page.locator("#main-content")).toBeVisible({
      timeout: 30_000,
    });
    // Below 768 px the studio is replaced by the table list; that is the surface to audit. The
    // swap happens in an effect after mount, so wait for it rather than catching the first paint.
    await expect(page.getByTestId("hall-studio")).toHaveCount(0, {
      timeout: 15_000,
    });
    await audit(page, "seating (phone)");

    await openChecklist(page, eventId);
    await audit(page, "checklist (phone)");

    await page.goto(`/events/${eventId}/day-of`);
    // Look for the page's own heading: "Run sheet" is also the installed app's header (hidden in a
    // browser) and a hidden label in the collapsed phone navigation.
    await expect(
      page
        .locator("main")
        .getByText(/The order of the day|Nothing is scheduled for the day/i)
        .first()
    ).toBeVisible({ timeout: 15_000 });
    await audit(page, "run sheet (phone)");
  });

  test("the new controls meet the 44px touch target", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const eventId = await studioWithTables(page, context);

    // Mode switch and the tool rail.
    await expectTargets(
      page
        .getByRole("radiogroup", { name: "How much detail to show" })
        .getByRole("radio")
    );
    await expectTargets(
      page.getByRole("toolbar", { name: "Hall tools" }).getByRole("button")
    );

    // The Fit deck's primary actions.
    await page.getByRole("tab", { name: /^Fit/ }).click();
    await expectTargets(
      page.getByRole("button", { name: /Suggest three layouts/i })
    );
    await expectTargets(
      page.getByRole("button", { name: /Auto layout the whole hall/i })
    );
    await expectTargets(
      page.getByRole("button", { name: "Apply", exact: true })
    );

    // The engine's option cards.
    await page.getByRole("button", { name: /Suggest three layouts/i }).click();
    await expect(page.getByText(/^Option 1$/)).toBeVisible({ timeout: 20_000 });
    await expectTargets(page.getByRole("button", { name: /Use this layout/i }));
    await expectTargets(page.getByRole("button", { name: /^Why\?$/ }));

    // The comparison bar.
    await page
      .getByRole("button", { name: /Use this layout/i })
      .first()
      .click();
    const compare = page.getByRole("group", {
      name: /Compare the current and new layouts/i,
    });
    await expect(compare).toBeVisible({ timeout: 10_000 });
    await expectTargets(compare.getByRole("button"));
    await compare.getByRole("button", { name: /Keep this/i }).click();

    // The cooling deck: add a unit, then every control on its card.
    await page.getByRole("tab", { name: /^Cooling/ }).click();
    await expect(
      page.getByRole("heading", { name: "The verdict" })
    ).toBeVisible({ timeout: 20_000 });
    await expectTargets(
      page.getByRole("button", { name: "Add one", exact: true })
    );
    await expectTargets(
      page.getByRole("button", { name: /Place on the floor/i })
    );
    await page.getByRole("button", { name: "Add one", exact: true }).click();
    await expect(page.getByText(/^Unit 1 ·/)).toBeVisible({ timeout: 10_000 });
    await expectTargets(
      page.locator("li", { hasText: /^Unit 1 ·/ }).getByRole("button")
    );

    // The checklist's own controls.
    await openChecklist(page, eventId);
    await expectTargets(
      page
        .getByRole("toolbar", { name: /Filter the checklist/i })
        .getByRole("button")
    );
    await expectTargets(page.getByRole("checkbox", { name: /^Tick / }).first());
    await expectTargets(page.getByRole("button", { name: /^Done$/ }).first());
  });

  test("a table can be moved without dragging", async ({ page, context }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await studioWithTables(page, context);

    // The Room deck lists every table as a button; choosing one opens the inspector.
    await page.getByRole("tab", { name: /^Room/ }).click();
    const summary = page.getByRole("region", { name: /The room in words/i });
    await expect(summary).toBeVisible();
    const firstTable = summary.getByRole("button").first();
    await firstTable.focus();
    await page.keyboard.press("Enter");

    // The inspector's Position fields are the keyboard equivalent of dragging a table.
    const fromLeft = page.getByLabel("From left");
    await expect(fromLeft).toBeVisible();
    const before = await fromLeft.inputValue();
    await fromLeft.fill(String(Number(before) + 1));
    await fromLeft.press("Enter");
    await expect(fromLeft).not.toHaveValue(before);
  });

  test("reduced motion is honoured", async ({ page, context }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await studioWithTables(page, context);

    // The global reduced-motion rule collapses transitions; the panel's 500 ms slide must not run.
    const seconds = await page.getByTestId("hall-studio").evaluate((el) => {
      const panel = el.querySelector('[role="tablist"]')?.parentElement;
      if (!panel) return 1;
      const d = getComputedStyle(panel).transitionDuration;
      return d.endsWith("ms") ? parseFloat(d) / 1000 : parseFloat(d);
    });
    expect(seconds).toBeLessThan(0.05);
  });

  test("the new surfaces survive 200% zoom", async ({ page, context }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const eventId = await studioWithTables(page, context);

    // 200 % zoom on a 1440 px screen leaves 720 CSS px, which is the app's phone breakpoint.
    await page.setViewportSize({ width: 720, height: 450 });
    for (const path of [
      `/events/${eventId}/seating`,
      `/events/${eventId}/checklist`,
      `/events/${eventId}/day-of`,
    ]) {
      await page.goto(path);
      await expect(page.locator("#main-content")).toBeVisible({
        timeout: 30_000,
      });
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );
      expect(
        overflow,
        `${path} scrolls sideways at 200% zoom`
      ).toBeLessThanOrEqual(1);
    }
  });
});
