import { test, expect, type Frame, type Page } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

/**
 * Furniture and chairs on a stage, checked in the drawn scene rather than in a picture of it: the
 * hall answers an `inspect` command with where everything really stands, in metres.
 *
 * The hall loads three.js from a CDN. CI can reach it; a sandbox that cannot may point
 * HALL3D_THREE_DIR at a local `three@0.169.0` package and the same files are served from there.
 */

interface Seen {
  stageItems: { id: string; x: number; y: number; z: number; yaw: number }[];
  chairs: { id: string; x: number; y: number; z: number }[];
}

async function hallFrame(page: Page): Promise<Frame> {
  const handle = await page.locator("iframe[src*='hall3d']").elementHandle();
  const frame = await handle!.contentFrame();
  if (!frame) throw new Error("the hall frame did not load");
  return frame;
}

/** Ask the hall where everything is, from the page that owns it. */
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
          { source: "ariya-studio", t: "cmd", cmd: "inspect" },
          window.location.origin
        );
      })
  );
}

/** What a drag in the hall reports when the host lets go of a chair at (x, y). */
async function dropChair(page: Page, id: string, x: number, y: number) {
  const frame = await hallFrame(page);
  await frame.evaluate(
    ({ id, x, y }) =>
      window.parent.postMessage(
        {
          source: "ariya-hall3d",
          t: "move",
          items: [{ type: "chair", id, x, y }],
        },
        window.location.origin
      ),
    { id, x, y }
  );
}

test.describe("Stage fixtures and chairs", () => {
  test("fixtures stand apart on the deck, and a chair follows the stage it is dropped on", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    const local = process.env.HALL3D_THREE_DIR;
    if (local)
      await context.route(
        "https://cdn.jsdelivr.net/npm/three@0.169.0/**",
        (route) =>
          route.fulfill({
            path: `${local}/${new URL(route.request().url()).pathname.replace("/npm/three@0.169.0/", "")}`,
            contentType: "text/javascript",
            headers: { "access-control-allow-origin": "*" },
          })
      );
    await page.setViewportSize({ width: 1440, height: 900 });
    await createAndLoginUser(page, context, "stage_fx");
    const { eventId } = await createTestEvent(page);
    await page.goto(`/events/${eventId}/seating`);
    await expect(page.getByTestId("hall-studio")).toBeVisible({
      timeout: 30_000,
    });

    // The hall answers once it has drawn the room; the rail is not live before that.
    await expect
      .poll(
        () =>
          inspect(page).then(
            () => true,
            () => false
          ),
        {
          timeout: 30_000,
        }
      )
      .toBe(true);

    // A new stage, then four fixtures from its inspector.
    await page
      .getByRole("button", { name: /Add a stage, dance floor or area/i })
      .click();
    await page.getByRole("button", { name: /^Stage$/ }).click();
    const inspector = page.getByTestId("hall-inspector");
    await expect(inspector).toBeVisible();
    for (const kind of ["Couch", "Table", "Cake table", "Screen"]) {
      await inspector.getByRole("button", { name: kind, exact: true }).click();
    }
    await expect
      .poll(async () => (await inspect(page)).stageItems.length, {
        timeout: 15_000,
      })
      .toBe(4);

    const seen = await inspect(page);
    // The new stage is the 9 x 4 m one at the front: (15, 2.4).
    const stage = { x: 15, y: 2.4, w: 9, h: 4 };
    for (const a of seen.stageItems) {
      // On the deck, and inside the stage's width and depth.
      expect(a.y, "stands on the deck").toBeCloseTo(0.8, 1);
      expect(Math.abs(a.x - stage.x)).toBeLessThanOrEqual(stage.w / 2);
      expect(Math.abs(a.z - stage.y)).toBeLessThanOrEqual(stage.h / 2);
    }
    // The stacking bug: a couch, a table and a cake table all drawn at the same spot.
    for (let i = 0; i < seen.stageItems.length; i++)
      for (let j = i + 1; j < seen.stageItems.length; j++) {
        const a = seen.stageItems[i];
        const b = seen.stageItems[j];
        expect(
          Math.hypot(a.x - b.x, a.z - b.z),
          `fixtures ${i} and ${j} share a spot`
        ).toBeGreaterThanOrEqual(0.9);
      }

    // A chair on the floor, then dropped on the stage, then dropped back.
    await page.getByRole("button", { name: "Add chairs" }).click();
    await page.getByRole("button", { name: /One chair/ }).click();
    await expect
      .poll(async () => (await inspect(page)).chairs.length, {
        timeout: 15_000,
      })
      .toBe(1);
    const chair = (await inspect(page)).chairs[0];
    expect(chair.y, "on the floor to begin with").toBe(0);

    await dropChair(page, chair.id, 13, 2.4);
    await expect
      .poll(async () => (await inspect(page)).chairs[0], { timeout: 10_000 })
      .toMatchObject({ x: 13, y: 0.8, z: 2.4 });

    await dropChair(page, chair.id, 6, 14);
    await expect
      .poll(async () => (await inspect(page)).chairs[0], { timeout: 10_000 })
      .toMatchObject({ x: 6, y: 0, z: 14 });
  });
});
