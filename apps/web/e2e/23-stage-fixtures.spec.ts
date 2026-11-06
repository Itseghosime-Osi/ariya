import {
  test,
  expect,
  type BrowserContext,
  type Frame,
  type Page,
} from "@playwright/test";
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
  chairs: {
    id: string;
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
  }[];
  points: { x: number; y?: number; z: number; sx: number; sy: number }[];
}

async function hallFrame(page: Page): Promise<Frame> {
  const handle = await page.locator("iframe[src*='hall3d']").elementHandle();
  const frame = await handle!.contentFrame();
  if (!frame) throw new Error("the hall frame did not load");
  return frame;
}

/** Ask the hall where everything is, from the page that owns it. */
async function inspect(
  page: Page,
  points: { x: number; y?: number; z: number }[] = []
): Promise<Seen> {
  return page.evaluate(
    (points) =>
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
          { source: "ariya-studio", t: "cmd", cmd: "inspect", points },
          window.location.origin
        );
      }),
    points
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

/** Sign in, open the seating studio and wait until the hall has drawn the room. */
async function openHall(page: Page, context: BrowserContext) {
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
}

test.describe("Stage fixtures and chairs", () => {
  test("fixtures stand apart on the deck, and a chair follows the stage it is dropped on", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await openHall(page, context);

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

  test("a chair picked up with the mouse follows the stage it is dropped on", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await openHall(page, context);

    await page.getByRole("button", { name: "Add chairs" }).click();
    await page.getByRole("button", { name: /One chair/ }).click();
    await expect
      .poll(async () => (await inspect(page)).chairs.length, {
        timeout: 15_000,
      })
      .toBe(1);

    // Bring the stage and the chair close, so the chair's pick box is a real target, and wait for
    // the camera to stop: aiming at a moving view is what makes a drag flaky.
    await page.evaluate(() =>
      document
        .querySelector<HTMLIFrameElement>("iframe[src*='hall3d']")!
        .contentWindow!.postMessage(
          {
            source: "ariya-studio",
            t: "cmd",
            cmd: "frame",
            at: { x: 15, y: 5, w: 9, h: 9, height: 0 },
          },
          window.location.origin
        )
    );
    let last = "";
    await expect
      .poll(
        async () => {
          const now = JSON.stringify((await inspect(page)).chairs[0]);
          const same = now === last;
          last = now;
          return same;
        },
        { timeout: 10_000, intervals: [700] }
      )
      .toBe(true);

    /** Pick the chair up at its pick box and carry it to a spot on the floor, as a host would. */
    const carry = async (to: { x: number; z: number }) => {
      const seen = await inspect(page, [{ x: to.x, y: 0, z: to.z }]);
      const c = seen.chairs[0];
      // The pointer holds the box's middle, so aim the same height above the floor spot.
      const floorUnderChair = await inspect(page, [{ x: c.x, y: 0, z: c.z }]);
      const lift = {
        x: c.sx - floorUnderChair.points[0].sx,
        y: c.sy - floorUnderChair.points[0].sy,
      };
      const goal = {
        x: seen.points[0].sx + lift.x,
        y: seen.points[0].sy + lift.y,
      };
      await page.mouse.move(c.sx, c.sy);
      await page.mouse.down();
      const steps = 14;
      for (let i = 1; i <= steps; i++)
        await page.mouse.move(
          c.sx + ((goal.x - c.sx) * i) / steps,
          c.sy + ((goal.y - c.sy) * i) / steps
        );
      await page.mouse.up();
    };

    // The starting plan's stage is 9 m wide and 3.6 m deep, centred at (15, 2.2): x 10.5 to 19.5,
    // z 0.4 to 4. Aim at its middle.
    await carry({ x: 15, z: 2.2 });
    await expect
      .poll(async () => (await inspect(page)).chairs[0].y, { timeout: 10_000 })
      .toBe(0.8);
    const onDeck = (await inspect(page)).chairs[0];
    expect(Math.abs(onDeck.x - 15)).toBeLessThanOrEqual(4.5);
    expect(onDeck.z).toBeGreaterThanOrEqual(0.4);
    expect(onDeck.z).toBeLessThanOrEqual(4);

    // And back onto the floor, well clear of the stage.
    await carry({ x: 15, z: 9 });
    await expect
      .poll(async () => (await inspect(page)).chairs[0].y, { timeout: 10_000 })
      .toBe(0);
  });
});
