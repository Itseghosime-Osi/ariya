import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";

test.describe("RSVP questions and the access card", () => {
  test("host asks a question, guest answers it, card can be switched off", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await createAndLoginUser(page, context, "rsvp_questions_host");
    const { eventId } = await createTestEvent(page);

    // A guest to invite.
    await page.goto(`/events/${eventId}/guests`);
    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .locator('input[placeholder="Chief Olawale Adeyemi"]')
      .fill("Ngozi Eze");
    await page.getByRole("button", { name: /add to guestbook/i }).click();
    await page.getByText("Ngozi Eze").first().click();
    await page
      .getByRole("button", { name: /copy link/i })
      .first()
      .click();
    const inviteUrl = await page.evaluate(() => navigator.clipboard.readText());

    // The host writes a required pick-one question.
    await page.goto(`/events/${eventId}/page-editor`);
    await page.getByRole("tab", { name: /rsvp & card/i }).click();
    await page.getByRole("button", { name: /^add$/i }).click();
    await page.getByRole("textbox", { name: "Question 1" }).fill("Which meal?");
    await page.getByRole("button", { name: "Pick one" }).click();
    await page.getByRole("textbox", { name: "Choice 1" }).fill("Jollof");
    await page.getByRole("textbox", { name: "Choice 2" }).fill("Fried rice");
    await page.getByRole("switch", { name: /question 1 is required/i }).click();
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(
      page.getByText(/guests see this when they reply/i)
    ).toBeVisible();

    // The guest cannot accept without answering.
    await page.goto(inviteUrl);
    await expect(page.getByText("Which meal?")).toBeVisible();
    await page.getByLabel(/Joyfully Accept/i).check();
    await page.getByRole("button", { name: /submit rsvp response/i }).click();
    await expect(page.getByText(/please answer: which meal/i)).toBeVisible();

    await page.getByLabel("Which meal?").selectOption("Fried rice");
    await page.getByRole("button", { name: /submit rsvp response/i }).click();
    await expect(page.getByText(/RSVP Confirmed & Honoured/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Fried rice")).toBeVisible();
    await expect(page.getByText(/Personal Entry Code/i)).toBeVisible();

    // The guest can save their invitation, with the card on it.
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /save my invitation/i }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("invitation-Ngozi-Eze.png");

    // The host sees the answer.
    await page.goto(`/events/${eventId}/page-editor`);
    await page.getByRole("tab", { name: /rsvp & card/i }).click();
    await expect(page.getByText("Ngozi Eze")).toBeVisible();
    await expect(page.getByText("Fried rice")).toBeVisible();

    // Switching the card off removes it from the guest's pass.
    await page
      .getByRole("switch", { name: /give each guest an access card/i })
      .click();
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(
      page.getByText(/guests see this when they reply/i)
    ).toBeVisible();
    await page.goto(inviteUrl);
    await expect(page.getByText(/Personal Entry Code/i)).toHaveCount(0);
    await expect(page.getByText(/no card is needed/i)).toBeVisible();
  });
});
