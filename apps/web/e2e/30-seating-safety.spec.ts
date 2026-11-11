import { test, expect, type Page } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";
import { serviceRoleClient } from "./fixtures/service-role";

/**
 * The seating studio never loses work quietly: a failed save says so and can be retried, a second
 * editor cannot overwrite a newer hall without being asked, and "Seat everyone" can be taken back.
 */

async function seedAccepted(eventId: string, n: number) {
  const db = serviceRoleClient();
  const rows = Array.from({ length: n }, (_, i) => ({
    event_id: eventId,
    name: `Safety Guest ${i + 1}`,
    side: "bride",
    group_name: "Family",
    party_size: 1,
    rsvp_token: `safety-${Date.now()}-${i}`,
  }));
  const { data, error } = await db.from("guests").insert(rows).select("id");
  if (error) throw new Error(error.message);
  const r = await db.from("rsvps").upsert(
    data!.map((g) => ({
      guest_id: g.id,
      status: "accepted",
      attending_count: 1,
      responded_at: new Date().toISOString(),
    })),
    { onConflict: "guest_id" }
  );
  if (r.error) throw new Error(r.error.message);
}

async function openStudio(page: Page, eventId: string) {
  await page.goto(`/events/${eventId}/seating`);
  await expect(page.getByTestId("hall-studio")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("hall-save-status")).toBeVisible();
}

async function setRoom(page: Page, field: RegExp, value: string) {
  await page.getByRole("tab", { name: /^Room/ }).click();
  const input = page.getByLabel(field).first();
  await input.fill(value);
  await input.press("Tab");
}

test.describe("Seating safety", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("a failed save says Not saved, and Retry saves it", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await createAndLoginUser(page, context, "save_fail");
    const { eventId } = await createTestEvent(page);
    await openStudio(page, eventId);

    // Refuse every save request.
    await page.route("**/*", (route) => {
      const r = route.request();
      if (r.method() === "POST" && r.headers()["next-action"])
        return route.abort();
      return route.continue();
    });
    await setRoom(page, /^Width/, "31");

    const status = page.getByTestId("hall-save-status");
    await expect(status).toHaveAttribute("data-state", "failed", {
      timeout: 15_000,
    });
    await expect(status).toContainText("Not saved");

    await page.unroute("**/*");
    await status.getByRole("button", { name: "Retry" }).click();
    await expect(status).toHaveAttribute("data-state", "saved", {
      timeout: 15_000,
    });
  });

  test("a second editor is asked before overwriting a newer hall", async ({
    page,
    context,
  }) => {
    test.setTimeout(150_000);
    await createAndLoginUser(page, context, "conflict");
    const { eventId } = await createTestEvent(page);
    await openStudio(page, eventId);

    const other = await context.newPage();
    await other.setViewportSize({ width: 1280, height: 800 });
    await openStudio(other, eventId);

    // The first tab saves a wider hall.
    await setRoom(page, /^Width/, "40");
    await expect(page.getByTestId("hall-save-status")).toHaveAttribute(
      "data-state",
      "saved",
      {
        timeout: 15_000,
      }
    );

    // The second tab still holds the old hall; its save is refused, not applied.
    await setRoom(other, /^Length/, "25");
    await expect(other.getByTestId("hall-conflict")).toBeVisible({
      timeout: 15_000,
    });

    await other.getByRole("button", { name: "Load their version" }).click();
    await expect(other.getByTestId("hall-conflict")).toHaveCount(0);
    await expect(other.getByText(/40 × 20 m/).first()).toBeVisible();

    // The wider hall survived a reload.
    await page.reload();
    await expect(page.getByTestId("hall-studio")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/40 × 20 m/).first()).toBeVisible();
    await other.close();
  });

  test("Seat everyone can be undone in one step", async ({ page, context }) => {
    test.setTimeout(150_000);
    await createAndLoginUser(page, context, "undo_seat");
    const { eventId } = await createTestEvent(page);
    await seedAccepted(eventId, 12);
    await openStudio(page, eventId);

    await page.getByRole("tab", { name: /^Fit/ }).click();
    await page.getByLabel(/Set the number of tables/i).fill("3");
    await page.getByRole("button", { name: /^Apply$/ }).click();
    await expect(page.getByRole("tab", { name: /^Seat/ })).toBeVisible();

    await page.getByRole("tab", { name: /^Seat/ }).click();
    await page.getByRole("button", { name: /^Seat \d+ guests?/ }).click();
    await expect(page.getByText(/Seating chart updated/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("tab", { name: /^Seat/ })).toContainText(
      "100% seated"
    );

    await page.getByTestId("undo-seat-everyone").click();
    await expect(page.getByText(/Took back 12 seats/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("tab", { name: /^Seat/ })).toContainText(
      "0% seated"
    );

    // The database agrees: nobody is seated.
    const { count } = await serviceRoleClient()
      .from("seat_assignments")
      .select("guest_id", { count: "exact", head: true })
      .in(
        "guest_id",
        (
          await serviceRoleClient()
            .from("guests")
            .select("id")
            .eq("event_id", eventId)
        ).data!.map((g) => g.id)
      );
    expect(count).toBe(0);
  });
});
