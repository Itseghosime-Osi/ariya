import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";
import { serviceRoleClient } from "./fixtures/service-role";
import { DESK, makeAdmin, totp, userIdFor } from "./fixtures/admin";

/** The test server's secret desk address (see playwright.config.ts) for an internal /admin path. */
const D = (path: string) => path.replace(/^\/admin(?=\/|\?|$)/, DESK);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A URL pattern under the desk; "$" means the desk's front page itself. */
const DESK_RE = (rest: string) =>
  rest === "$" ? new RegExp(`${esc(DESK)}$`) : new RegExp(esc(DESK + rest));

/** Pass the two-step screen, setting up the authenticator the first time. */
async function passSecondStep(page: Page) {
  await page.goto(D("/admin"));
  await page.waitForURL(DESK_RE("/verify"));
  await expect(
    page.getByRole("heading", { name: "Set up two-step sign-in" })
  ).toBeVisible();
  const secret =
    (await page.getByTestId("totp-secret").textContent())?.trim() ?? "";
  expect(secret.length).toBeGreaterThan(10);
  await page.getByLabel("Six-digit code").fill(totp(secret));
  await page.getByRole("button", { name: "Open the admin desk" }).click();
  await page.waitForURL(DESK_RE("$"));
}

test.describe("Admin desk", () => {
  test("is invisible to everyone who is not an admin", async ({
    page,
    context,
  }) => {
    for (const path of ["/admin", DESK]) {
      const signedOut = await page.goto(path);
      expect(signedOut?.status(), path).toBe(404);
    }

    await createAndLoginUser(page, context, "not_admin");
    for (const path of [
      "/admin",
      "/admin/accounts",
      "/admin/verify",
      "/admin/log",
    ]) {
      const res = await page.goto(D(path));
      expect(res?.status(), path).toBe(404);
    }
  });

  test("an admin passes two-step sign-in, acts with reasons, and every act is logged", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);

    // Someone else's account, to act on.
    const other = `admin_target_${Date.now()}@owambe.ng`;
    const { data: created } = await serviceRoleClient().auth.admin.createUser({
      email: other,
      password: "Celebration2026!",
      email_confirm: true,
      user_metadata: { full_name: "Target Person" },
    });
    expect(created.user?.id).toBeTruthy();

    const me = await createAndLoginUser(page, context, "admin_user");
    const { eventId, title } = await createTestEvent(page);
    makeAdmin(await userIdFor(me.email));

    // Admin, but without the second step: the code screen, not the desk.
    const desk = await page.goto(D("/admin/accounts"));
    expect(desk?.status()).toBe(200);
    await expect(page).toHaveURL(DESK_RE("/verify"));

    await passSecondStep(page);
    await expect(
      page.getByRole("heading", { name: "Overview", level: 1 })
    ).toBeVisible();
    await expect(page.getByText("Revenue, all time")).toBeVisible();

    // Celebrations: find mine, grant a complimentary pass.
    await page.goto(D(`/admin/events?q=${encodeURIComponent(title)}`));
    await page.getByRole("link", { name: title }).click();
    await expect(
      page.getByRole("heading", { name: title, level: 1 })
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Grant a complimentary pass" })
      .click();
    await page.getByLabel(/Why\?/).fill("Launch partner");
    await page
      .getByRole("button", { name: "Confirm: grant a complimentary pass" })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Complimentary pass granted"
    );
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();

    // The guest list asks why, then is shown and logged.
    await page.getByRole("link", { name: "Open the guest list" }).click();
    await page.getByLabel(/Why are you opening/).fill("Support ticket 12");
    await page.getByRole("button", { name: "Show the guest list" }).click();
    await expect(
      page.getByText(/This visit is in the admin log/)
    ).toBeVisible();

    // Withdraw the complimentary pass from the payment page (needs the reference typed).
    await page.goto(D(`/admin/events/${eventId}`));
    await page.getByRole("link", { name: /^COMP-/ }).click();
    await page.waitForURL(DESK_RE("/payments/"));
    await page.waitForURL(DESK_RE("/payments/"));
    const reference =
      (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ??
      "";
    await page.getByRole("button", { name: "Withdraw the pass" }).click();
    await page.getByLabel(/Why\?/).fill("Granted by mistake");
    const confirm = page.getByRole("button", {
      name: "Confirm: withdraw the pass",
    });
    await expect(confirm).toBeDisabled();
    await page.getByLabel(/Type the reference/).fill(reference);
    await confirm.click();
    await expect(page.getByRole("status")).toContainText(
      "no longer has a pass"
    );

    // Accounts: suspend, then restore, someone else.
    await page.goto(D(`/admin/accounts?q=${encodeURIComponent(other)}`));
    await page.getByRole("link", { name: "Target Person" }).click();
    await page.getByRole("button", { name: "Suspend account" }).click();
    await page.getByLabel(/Why\?/).fill("Spam invitations");
    await page
      .getByRole("button", { name: "Confirm: suspend account" })
      .click();
    await expect(page.getByRole("status")).toContainText("suspended");
    await expect(page.getByText("Suspended", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Restore account" }).click();
    await page.getByLabel(/Why\?/).fill("Resolved with the host");
    await page
      .getByRole("button", { name: "Confirm: restore account" })
      .click();
    await expect(page.getByRole("status")).toContainText("restored");

    // Delete it for good: the email must be typed.
    await page.getByRole("button", { name: "Delete account" }).click();
    await page.getByLabel(/Why\?/).fill("Asked us to close it");
    await page.getByLabel(/Type their email/).fill(other);
    await page.getByRole("button", { name: "Confirm: delete account" }).click();
    await page.waitForURL(DESK_RE("/accounts?notice="));
    await expect(page.getByRole("status")).toContainText("was deleted");
    const { data: gone } = await serviceRoleClient().auth.admin.getUserById(
      created.user!.id
    );
    expect(gone.user).toBeNull();

    // My own account cannot be acted on from here.
    await page.goto(D(`/admin/accounts/${await userIdFor(me.email)}`));
    await expect(page.getByText(/This is your own account/)).toBeVisible();

    // Delete my test celebration: its name must be typed.
    await page.goto(D(`/admin/events/${eventId}`));
    await page.getByRole("button", { name: "Delete celebration" }).click();
    await page.getByLabel(/Why\?/).fill("Test data");
    await page.getByLabel(/Type the celebration's name/).fill(title);
    await page
      .getByRole("button", { name: "Confirm: delete celebration" })
      .click();
    await page.waitForURL(DESK_RE("/events?notice="));
    await expect(page.getByRole("status")).toContainText("was deleted");
    expect((await page.goto(D(`/admin/events/${eventId}`)))?.status()).toBe(
      404
    );

    // The log has it all, newest first.
    await page.goto(D("/admin/log"));
    const log = page.getByRole("table");
    for (const text of [
      "Granted a complimentary pass",
      "Opened a guest list",
      "Refunded a payment",
      "Suspended an account",
      "Restored an account",
      "Deleted an account",
      "Deleted a celebration",
      "Support ticket 12",
    ]) {
      await expect(log.getByText(text).first()).toBeVisible();
    }

    // Even for an admin, the plain address stays "not found": the desk lives only at its secret one.
    expect((await page.goto("/admin"))?.status()).toBe(404);
    expect((await page.goto("/admin/accounts"))?.status()).toBe(404);

    // Every page renders, without accessibility errors.
    for (const [path, heading] of [
      ["/admin", "Overview"],
      ["/admin/accounts", "Accounts"],
      ["/admin/events", "Celebrations"],
      ["/admin/log", "Admin log"],
      ["/admin/payments", "Payments"],
      ["/admin/emails", "Emails"],
      ["/admin/ai", "AI connections"],
      ["/admin/health", "Health"],
    ] as const) {
      await page.goto(D(path));
      await expect(
        page.getByRole("heading", { name: heading, level: 1 })
      ).toBeVisible();
      const axe = await new AxeBuilder({ page }).analyze();
      expect(
        axe.violations.map((v) => `${v.id}: ${v.help}`),
        path
      ).toEqual([]);
    }
  });
});
