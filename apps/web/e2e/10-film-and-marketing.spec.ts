import { test, expect } from "@playwright/test";

test.describe("Film & Marketing Site Integration", () => {
  test("loads marketing routes and .html variants with 200 OK", async ({
    page,
  }) => {
    const routes = [
      "/",
      "/about",
      "/about.html",
      "/product",
      "/product.html",
      "/pricing",
      "/pricing.html",
      "/documentation",
      "/story",
      "/story.html",
    ];

    for (const route of routes) {
      const response = await page.goto(route, {
        waitUntil: "domcontentloaded",
      });
      expect(response, `Failed to load route ${route}`).not.toBeNull();
      expect(response?.status(), `Expected 200 status for ${route}`).toBe(200);
    }
  });

  test("renders the film as React markup, fetching no legacy entry assets and no 404s", async ({
    page,
  }) => {
    const failed404Urls: string[] = [];
    const loadedUrls: string[] = [];

    page.on("response", (res) => {
      const url = res.url();
      loadedUrls.push(url);
      if (res.status() === 404) {
        failed404Urls.push(url);
      }
    });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.locator(".film")).toBeVisible();

    // Mount is the deterministic point; the scene module and the score are
    // requested just after it. Give that wave a bounded window rather than
    // blocking the test on a third-party CDN.
    await page.waitForLoadState("load", { timeout: 5000 }).catch(() => {});

    // Verify 404 list is completely empty
    expect(
      failed404Urls,
      `Found 404 responses: ${failed404Urls.join(", ")}`
    ).toEqual([]);

    // The film is React markup now, so the archive document's entry assets are
    // gone: nav.js, fine-card.js and the score module must not be fetched, and
    // nav.css arrives as a bundled stylesheet rather than an asset URL.
    const legacy = ["nav.js", "fine-card.js", "demo.js", "score.js"];
    const stillRequested = legacy.filter((name) =>
      loadedUrls.some((url) => url.includes(`/site/assets/${name}`))
    );

    expect(
      stillRequested,
      `Legacy assets still requested: ${stillRequested.join(", ")}`
    ).toEqual([]);
  });

  test("checks /planner.html and /rsvp.html redirect correctly", async ({
    page,
  }) => {
    // /planner.html -> /events (redirects to /sign-in when unauthenticated)
    await page.goto("/planner.html");
    expect(page.url()).toMatch(/\/(events|sign-in\?next=%2Fevents)/);

    // /rsvp.html without params -> /events
    await page.goto("/rsvp.html");
    expect(page.url()).toMatch(/\/(events|sign-in\?next=%2Fevents)/);

    // /rsvp.html?token=demo_token_123 -> /i/demo_token_123
    await page.goto("/rsvp.html?token=demo_token_123");
    expect(page.url()).toContain("/i/demo_token_123");

    // /rsvp.html?g=k701Qx -> /i/k701Qx
    await page.goto("/rsvp.html?g=k701Qx");
    expect(page.url()).toContain("/i/k701Qx");
  });
});
