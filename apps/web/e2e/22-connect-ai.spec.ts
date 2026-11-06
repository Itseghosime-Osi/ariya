import { test, expect } from "@playwright/test";
import { createAndLoginUser } from "./fixtures/test-helpers";

test.describe("Connect your AI", () => {
  test("pick an AI, press the one button, and the right thing is copied or linked", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await createAndLoginUser(page, context, "connect_ai_user");
    // Record what the buttons open instead of loading other sites in the test browser.
    await page.addInitScript(() => {
      const opened: string[] = [];
      (window as unknown as { __opened: string[] }).__opened = opened;
      window.open = (url) => {
        opened.push(String(url));
        return null;
      };
    });
    const lastOpened = () =>
      page.evaluate(() => {
        const list = (window as unknown as { __opened: string[] }).__opened;
        return list[list.length - 1];
      });
    await page.goto("/connect-ai");

    await expect(
      page.getByRole("heading", { name: /connect your ai/i })
    ).toBeVisible();
    // Everyday assistants only; coding tools live under "for developers".
    await expect(page.getByRole("radio")).toHaveCount(4);
    await expect(page.getByRole("radio", { name: /gemini/i })).toBeVisible();
    await expect(
      page.getByRole("radio", { name: /cursor|vs code/i })
    ).toHaveCount(0);

    // Nothing to do until an AI is chosen.
    await expect(page.getByText(/pick the ai you use/i)).toBeVisible();

    // Claude: one button opens Claude with Àríyá already filled in. Nothing is copied.
    await page.evaluate(() => navigator.clipboard.writeText("untouched"));
    await page.getByRole("radio", { name: /^Claude/ }).click();
    const openClaude = page.getByRole("button", {
      name: /open claude and connect/i,
    });
    await openClaude.click();
    const claudeUrl = new URL((await lastOpened())!);
    expect(claudeUrl.origin + claudeUrl.pathname).toBe(
      "https://claude.ai/customize/connectors"
    );
    expect(claudeUrl.searchParams.get("modal")).toBe("add-custom-connector");
    expect(claudeUrl.searchParams.get("connectorUrl")).toMatch(/\/mcp$/);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "untouched"
    );
    await expect(page.getByText(/waiting for you to approve/i)).toBeVisible();

    // Gemini and ChatGPT have no prefilled link, so the link is copied for the person.
    for (const [name, host] of [
      ["Gemini", "gemini.google.com"],
      ["ChatGPT", "chatgpt.com"],
    ] as const) {
      await page.getByRole("radio", { name: new RegExp(`^${name}`) }).click();
      await page
        .getByRole("button", {
          name: new RegExp(`copy link and open ${name}`, "i"),
        })
        .click();
      expect(await lastOpened()).toContain(host);
      await expect(page.getByText(/^Copied\./)).toBeVisible();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
        /\/mcp$/
      );
    }

    // The plain MCP link and the developer commands are there for anyone who wants them.
    await page.getByText(/prefer to do it yourself/i).click();
    await expect(page.getByTestId("mcp-address")).toContainText("/mcp");
    await expect(
      page.getByText("claude mcp add --transport http ariya")
    ).toBeVisible();
  });
});
