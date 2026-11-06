import { test, expect } from "@playwright/test";
import { createAndLoginUser } from "./fixtures/test-helpers";

test.describe("Connect your AI", () => {
  test("pick an AI, press the one button, and the right thing is copied or linked", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await createAndLoginUser(page, context, "connect_ai_user");
    await page.goto("/connect-ai");

    await expect(
      page.getByRole("heading", { name: /connect your ai/i })
    ).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(7);

    // Nothing to do until an AI is chosen.
    await expect(page.getByText(/pick the ai you use/i)).toBeVisible();

    // Claude: the button copies the link, and the steps say what to do next.
    await page.getByRole("radio", { name: /^Claude Chat app/ }).click();
    const copyOpen = page.getByRole("button", {
      name: /copy link and open claude/i,
    });
    await expect(copyOpen).toBeVisible();
    const popup = page.waitForEvent("popup");
    await copyOpen.click();
    expect((await popup).url()).toContain("claude.ai");
    await expect(page.getByText(/^Copied\./)).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/\/mcp$/);
    await expect(page.getByText(/waiting for you to approve/i)).toBeVisible();

    // Claude Code: one command to paste.
    await page.getByRole("radio", { name: /^Claude Code/ }).click();
    await page.getByRole("button", { name: /copy the command/i }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
      /^claude mcp add --transport http ariya https?:\/\/.+\/mcp$/
    );

    // Cursor: a one-click install link, no copying.
    await page.getByRole("radio", { name: /^Cursor/ }).click();
    await expect(
      page.getByRole("button", { name: /add to cursor/i })
    ).toBeVisible();

    // The plain MCP link is there for anyone who wants it.
    await page.getByText(/prefer to do it yourself/i).click();
    await expect(page.getByTestId("mcp-address")).toContainText("/mcp");
  });
});
