import { expect, test, type Page } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";
import { serviceRoleClient } from "./fixtures/service-role";

/**
 * The door keeps working when the hall has no signal. The desk is opened with a signal (which saves
 * the page and a copy of the guest list on the phone), then the network drops while it is open, the
 * usual way it happens at a door: passes are verified and admitted from the phone, a name search
 * still finds guests, and nobody is let in twice. When the signal returns the admissions are sent,
 * and a guest another phone had already let in is reported rather than counted twice. Last, the page
 * itself opens again with no signal.
 */
async function verifyCode(page: Page, code: string) {
  await page.locator("#entry-code").fill(code);
  await page.getByRole("button", { name: /^Verify pass/ }).click();
}

test("check-in admits from the phone with no signal, then syncs", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  const db = serviceRoleClient();
  await createAndLoginUser(page, context, "offline_door");
  const { eventId } = await createTestEvent(page);

  const stamp = Date.now();
  const { data: guests } = await db
    .from("guests")
    .insert([
      {
        event_id: eventId,
        name: "Adaeze Okafor",
        side: "bride",
        rsvp_token: `oc-${stamp}-1`,
      },
      {
        event_id: eventId,
        name: "Tunde Bello",
        side: "groom",
        rsvp_token: `oc-${stamp}-2`,
      },
    ])
    .select("id, name, check_in_code");
  const ada = guests!.find((g) => g.name === "Adaeze Okafor")!;
  const tunde = guests!.find((g) => g.name === "Tunde Bello")!;
  await db.from("rsvps").upsert(
    [
      {
        guest_id: ada.id,
        status: "accepted",
        attending_count: 2,
        responded_at: new Date().toISOString(),
      },
      {
        guest_id: tunde.id,
        status: "accepted",
        attending_count: 1,
        responded_at: new Date().toISOString(),
      },
    ],
    { onConflict: "guest_id" }
  );

  // Open the desk with a signal: the worker saves the page, the desk saves the guest list.
  const desk = `/events/${eventId}/check-in`;
  await page.goto(desk);
  await page.waitForFunction(
    async () =>
      Boolean((await navigator.serviceWorker?.getRegistration())?.active),
    undefined,
    { timeout: 30_000 }
  );
  await page.goto(desk);
  const status = page.getByTestId("check-in-offline-status");
  await expect(status).toContainText("Ready for no signal: 2 guests saved", {
    timeout: 20_000,
  });

  // The signal drops while the desk is open, the usual way it happens at a door.
  await context.setOffline(true);
  await expect(status).toContainText("No signal. Check-in keeps working", {
    timeout: 15_000,
  });

  // Verify and admit Adaeze's party of two from the phone.
  await verifyCode(page, ada.check_in_code);
  // The desk offers the whole party by default.
  await page.getByRole("button", { name: "Admit 2 guests" }).click();
  await expect(
    page.getByText(/sent when the signal is back/).first()
  ).toBeVisible();
  await expect(page.getByText("Waiting to send").first()).toBeVisible();

  // The same pass again: the phone knows they are already in.
  await verifyCode(page, ada.check_in_code);
  await expect(page.getByText(/2 of 2 admitted/).first()).toBeVisible();

  // A name search still works, from the phone's copy.
  await page.locator("#guest-name-search").fill("Tunde");
  await page.getByRole("button", { name: /Tunde Bello/ }).click();
  // Meanwhile another phone with a signal lets Tunde in.
  await db.from("check_ins").insert({
    event_id: eventId,
    guest_id: tunde.id,
    checked_in_count: 1,
  });
  await page.getByRole("button", { name: "Admit 1 guest" }).click();
  await expect(page.getByText("Waiting to send")).toHaveCount(2);

  // The signal is back: everything is sent, Tunde is reported, not counted twice.
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(
    page.getByRole("alert").filter({ hasText: "Tunde Bello" })
  ).toContainText("already let in on another phone", { timeout: 30_000 });
  await expect(status).toContainText("Ready for no signal", {
    timeout: 30_000,
  });

  // The page itself is saved too, so the desk opens again with no signal.
  await context.setOffline(true);
  await page.goto(desk);
  await expect(
    page.getByRole("heading", { name: "Find a guest by name" })
  ).toBeVisible({ timeout: 15_000 });
  await context.setOffline(false);

  const { data: rows } = await db
    .from("check_ins")
    .select("guest_id, checked_in_count")
    .eq("event_id", eventId);
  const total = (id: string) =>
    (rows ?? [])
      .filter((r) => r.guest_id === id)
      .reduce((n, r) => n + r.checked_in_count, 0);
  expect(total(ada.id)).toBe(2);
  expect(total(tunde.id)).toBe(1);
});
