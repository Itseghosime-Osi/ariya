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

  test("checks every legacy asset the film requests loads with zero 404s", async ({
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

    const response = await page.goto("/", { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);

    // Verify 404 list is completely empty
    expect(
      failed404Urls,
      `Found 404 responses: ${failed404Urls.join(", ")}`
    ).toEqual([]);

    // Verify that key legacy film assets were loaded
    const hasNavCss = loadedUrls.some((u) => u.includes("nav.css"));
    const hasNavJs = loadedUrls.some((u) => u.includes("nav.js"));
    const hasFineCard = loadedUrls.some((u) => u.includes("fine-card.js"));

    expect(hasNavCss, "nav.css was not loaded").toBe(true);
    expect(hasNavJs, "nav.js was not loaded").toBe(true);
    expect(hasFineCard, "fine-card.js was not loaded").toBe(true);
  });

  test("never serves the private song", async ({ request }) => {
    for (const url of ["/assets/music.mp3", "/site/assets/music.mp3"]) {
      const res = await request.get(url);
      expect(res.status(), `${url} must not be served`).toBe(404);
      expect(res.headers()["content-type"] ?? "").not.toMatch(/audio/);
    }
  });

  test("the film and About page never request the song without the demo opt-in", async ({
    page,
  }) => {
    const songRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("music.mp3")) songRequests.push(req.url());
    });
    await page.goto("/", { waitUntil: "load" });
    await page.goto("/about", { waitUntil: "load" });
    expect(songRequests).toEqual([]);
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
