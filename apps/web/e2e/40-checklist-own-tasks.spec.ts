import { test, expect, type Page } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";
import { serviceRoleClient } from "./fixtures/service-role";

/** The checklist builds itself on first open; wait until it has rows. */
async function openBuiltChecklist(page: Page, eventId: string) {
  await page.goto(`/events/${eventId}/checklist`);
  const build = page.getByRole("button", { name: /Build the checklist/i });
  const firstTick = page.getByRole("checkbox", { name: /^Tick / }).first();
  await expect(build.or(firstTick)).toBeVisible({ timeout: 30_000 });
  for (let attempt = 0; attempt < 10; attempt++) {
    if ((await build.count()) === 0) break;
    if (await build.isEnabled()) await build.click();
    try {
      await expect(firstTick).toBeVisible({ timeout: 3_000 });
      break;
    } catch {
      // Not seeded yet.
    }
  }
  await expect(firstTick).toBeVisible({ timeout: 30_000 });
}

async function dueDateOf(eventId: string, title: string): Promise<string> {
  const { data, error } = await serviceRoleClient()
    .from("tasks")
    .select("due_date")
    .eq("event_id", eventId)
    .eq("title", title)
    .single();
  if (error || !data?.due_date) throw new Error(`No due date for ${title}`);
  return data.due_date;
}

const plusDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

test.describe("The host's own checklist", () => {
  test.setTimeout(180_000);

  test("add your own task, edit a suggested one, and relative dates follow the event", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "own_tasks");
    const { eventId } = await createTestEvent(page);
    await openBuiltChecklist(page, eventId);

    // Add a task the plan doesn't know about, due three weeks before the day.
    await page.getByRole("button", { name: /^Add a task/ }).click();
    const form = page.getByRole("form", { name: "Add the task" });
    await form.getByLabel("Task").fill("Book the talking drummer");
    await form
      .getByRole("button", { name: "Book the day", exact: true })
      .click();
    await form.getByRole("button", { name: "Before the day" }).click();
    await form.getByLabel("How many").fill("3");
    await form.getByRole("button", { name: "weeks" }).click();
    await form.getByLabel(/Notes/).fill("Baba Ayo, 0803 000 0000");
    await form.getByRole("button", { name: "Add the task" }).click();
    await expect(
      page.getByText('Added "Book the talking drummer".')
    ).toBeVisible();

    const mine = page.getByRole("button", { name: /Book the talking drummer/ });
    await expect(mine).toBeVisible();
    await expect(mine).toContainText("Your task");
    await mine.click();
    await expect(page.getByText(/3 weeks before the day/)).toBeVisible();
    await expect(page.getByText("Baba Ayo, 0803 000 0000")).toBeVisible();

    // Edit a suggested task: its wording becomes the host's, and it is marked as edited.
    await page.getByRole("button", { name: /^Foundations/ }).click();
    await page.getByRole("button", { name: /^Lock the budget/ }).click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const edit = page.getByRole("form", { name: "Save the task" });
    await edit.getByLabel("Task").fill("Lock the budget with both families");
    await edit.getByRole("button", { name: "Save the task" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Lock the budget with both families/ })
    ).toContainText("Edited");

    // Both survive a reload.
    await page.reload();
    await expect(
      page.getByRole("checkbox", { name: "Tick Book the talking drummer" })
    ).toBeAttached({ timeout: 30_000 });
    await page.getByRole("button", { name: /^Foundations/ }).click();
    await expect(
      page.getByRole("checkbox", {
        name: "Tick Lock the budget with both families",
      })
    ).toBeAttached();

    // Moving the event a week later moves the relative task a week too.
    const before = await dueDateOf(eventId, "Book the talking drummer");
    const { data: event } = await serviceRoleClient()
      .from("events")
      .select("date")
      .eq("id", eventId)
      .single();
    const later = new Date(Date.parse(event!.date) + 7 * 86_400_000);
    await serviceRoleClient()
      .from("events")
      .update({ date: later.toISOString() })
      .eq("id", eventId);
    expect(await dueDateOf(eventId, "Book the talking drummer")).toBe(
      plusDays(before, 7)
    );
  });
});
