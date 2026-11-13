import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

/**
 * Cross-browser check (checklist B1/B6): every export format downloads in the browser it runs in,
 * and the file is named from the couple, accents kept. Runs in Chromium by default; the Firefox
 * and WebKit projects are added with CROSS_BROWSER=1 (see playwright.config.ts).
 */
const FORMATS = [
  ["High-Resolution PNG", "Download PNG", "Ọlá-Ṣeun-invitation.png"],
  ["Compressed JPEG", "Download JPEG", "Ọlá-Ṣeun-invitation.jpg"],
  ["PDF for printing", "Download PDF", "Ọlá-Ṣeun-invitation-print.pdf"],
  ["Design Backup (.json)", "Download JSON", "Ọlá-Ṣeun-invitation.json"],
] as const;

test("each export format downloads and is named from the couple, accents kept", async ({
  page,
}) => {
  test.setTimeout(300000);
  page.setDefaultTimeout(30000);
  await createAndLoginUser(page, undefined, "studio_names");
  const { eventId } = await createTestEvent(page, {
    title: "Names",
    couple: "Ọlá & Ṣeun",
  });
  await page.goto(`/events/${eventId}/invitations/design?mode=pro`);
  await expect(
    page.getByTestId("designer-stage").locator("[data-invitation-canvas]")
  ).toBeVisible();
  for (const [card, button, expected] of FORMATS) {
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await page.getByRole("button").filter({ hasText: card }).click();
    const pending = page.waitForEvent("download", { timeout: 90000 });
    await page.getByRole("button", { name: button, exact: true }).click();
    const download = await pending;
    expect(download.suggestedFilename().normalize("NFC")).toBe(
      expected.normalize("NFC")
    );
    await page.keyboard.press("Escape");
  }
});
