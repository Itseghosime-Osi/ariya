import { test, expect } from "@playwright/test";
import { createAndLoginUser } from "./fixtures/test-helpers";

const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

test.describe("Installable app", () => {
  test("serves a manifest that opens standalone, with real icons", async ({
    request,
  }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/events");

    for (const icon of manifest.icons as { src: string }[]) {
      const iconRes = await request.get(icon.src);
      expect(iconRes.status(), `${icon.src} should load`).toBe(200);
      expect(iconRes.headers()["content-type"]).toContain("image/png");
    }
  });

  test("pages link the manifest, the Apple icon and a theme colour", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]').first()).toHaveCount(
      1
    );
    await expect(
      page.locator('meta[name="mobile-web-app-capable"]')
    ).toHaveAttribute("content", "yes");
  });

  test("an iPhone visitor is shown how to add the app, and can dismiss it for good", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      userAgent: IPHONE_UA,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    try {
      await createAndLoginUser(page, context, "install_hint_user");
      await page.goto("/events");

      const hint = page.getByTestId("install-hint");
      await expect(hint).toBeVisible({ timeout: 15000 });
      await expect(hint).toContainText("Add to Home Screen");

      await hint.getByRole("button", { name: "Not now" }).click();
      await expect(hint).toBeHidden();

      await page.reload();
      await page.waitForTimeout(6000);
      await expect(page.getByTestId("install-hint")).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("an iPad visitor gets the card too, beside the page rather than over the nav", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      userAgent: IPAD_UA,
      viewport: { width: 820, height: 1180 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    try {
      await createAndLoginUser(page, context, "ipad_install_user");
      await page.goto("/events");

      const hint = page.getByTestId("install-hint");
      await expect(hint).toBeVisible({ timeout: 15000 });
      await expect(hint).toContainText("Add to Home Screen");
      // On a tablet it sits in the bottom-right corner, not full width.
      const box = await hint.boundingBox();
      expect(box?.width ?? 0).toBeLessThan(420);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeGreaterThan(700);
    } finally {
      await context.close();
    }
  });

  test("a desktop visitor is not nagged to install", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await createAndLoginUser(page, context, "no_nag_user");
    await page.goto("/events");
    await page.waitForTimeout(6000);
    await expect(page.getByTestId("install-hint")).toBeHidden();
  });
});
