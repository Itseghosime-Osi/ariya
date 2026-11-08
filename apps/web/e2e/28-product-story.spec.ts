import { expect, test } from "@playwright/test";

test.describe("What we do tour", () => {
  test("seven chapters and the rail on a wide screen", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/product");
    for (const id of [
      "chapter-list",
      "chapter-card",
      "chapter-send",
      "chapter-replies",
      "chapter-seats",
      "chapter-day",
      "chapter-helper",
    ]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
    await expect(
      page.getByRole("navigation", { name: "Story chapters" })
    ).toBeVisible();
  });

  test("the send sample marks ticked guests as sent and sends nothing", async ({
    page,
  }) => {
    await page.goto("/product");
    const send = page.getByRole("button", {
      name: /Send 3 invitations by email/,
    });
    await send.scrollIntoViewIfNeeded();
    await send.click();
    await expect(page.getByText("Sent", { exact: true })).toHaveCount(3);
    await expect(page.locator(".ps-note")).toContainText(/nothing is sent/i);
  });
});
