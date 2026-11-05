import { expect, test } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";
import { serviceRoleClient } from "./fixtures/service-role";

test.describe("An event ends with its day", () => {
  test("public page and invitation links expire, and nothing about the event can change", async ({
    page,
    browser,
    context,
  }) => {
    test.setTimeout(120_000);
    const db = serviceRoleClient();

    await createAndLoginUser(page, context, "event_host_expiry");
    const { eventId, venue } = await createTestEvent(page);

    const { data: row } = await db
      .from("events")
      .select("slug")
      .eq("id", eventId)
      .single();
    const slug = row!.slug as string;

    // A published page and one invited guest, while the celebration is still ahead.
    await db.from("events").update({ is_public: true }).eq("id", eventId);
    const { data: invited } = await db
      .from("guests")
      .insert({
        event_id: eventId,
        name: "Expiry Guest",
        rsvp_token: `expiry-${Date.now()}`,
        check_in_code: `EX${Date.now().toString().slice(-8)}`,
      })
      .select("rsvp_token")
      .single();
    // The database issues its own token; use the one it kept.
    const token = invited!.rsvp_token as string;

    await db.from("vendors").insert({
      event_id: eventId,
      name: "Mama Put Catering",
      category: "Catering",
      cost_kobo: 100_000_00,
      deposit_kobo: 20_000_00,
    });

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(`/e/${slug}`);
    await expect(guestPage.getByText(venue).first()).toBeVisible();

    // The day passes.
    const past = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const moved = await db
      .from("events")
      .update({ date: past })
      .eq("id", eventId);
    expect(moved.error).toBeNull();

    // The public page only says it has ended, and shows nothing about the celebration.
    await guestPage.goto(`/e/${slug}`);
    await expect(guestPage.getByTestId("event-expired")).toBeVisible();
    await expect(guestPage.getByText(venue)).toHaveCount(0);

    // So does a guest's personal link.
    await guestPage.goto(`/i/${token}`);
    await expect(guestPage.getByTestId("event-expired")).toBeVisible();
    await guest.close();

    // The date, the link and the public switch can no longer be changed, even by the database's own
    // service role.
    for (const patch of [
      { date: new Date(Date.now() + 90 * 86_400_000).toISOString() },
      { is_public: false },
      { title: "A different party" },
    ]) {
      const res = await db.from("events").update(patch).eq("id", eventId);
      expect(res.error?.message).toMatch(/ended/i);
    }
    const added = await db.from("guests").insert({
      event_id: eventId,
      name: "Late Guest",
      rsvp_token: `late-${Date.now()}`,
      check_in_code: `LT${Date.now().toString().slice(-8)}`,
    });
    expect(added.error?.message).toMatch(/ended/i);

    // The host sees a locked celebration.
    await page.goto(`/events/${eventId}/settings`);
    await expect(page.getByTestId("event-ended-banner")).toBeVisible();
    await expect(page.locator("#setting-title")).toBeDisabled();
    await expect(page.locator("#setting-date")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: /save settings/i })
    ).toHaveCount(0);

    // Vendors: nothing can be added or removed, but a payment can still be recorded.
    await page.goto(`/events/${eventId}/vendors`);
    await expect(
      page.getByRole("button", { name: /add vendor/i })
    ).toBeDisabled();
    await page
      .locator("button[aria-expanded]")
      .filter({ hasText: "Mama Put Catering" })
      .click();
    await expect(
      page.getByRole("button", { name: /^delete mama put/i })
    ).toBeDisabled();
    await page.getByRole("button", { name: /record payment/i }).click();
    await expect(page.locator("#vendor-name")).toBeDisabled();
    await page.locator("#vendor-deposit").fill("50000");
    await page.getByRole("button", { name: /save payment/i }).click();
    await expect(page.getByText(/payment|updated/i).first()).toBeVisible();

    // Guests: the registry is read-only.
    await page.goto(`/events/${eventId}/guests`);
    await expect(
      page.getByRole("button", { name: /add guest/i })
    ).toBeDisabled();
  });
});
