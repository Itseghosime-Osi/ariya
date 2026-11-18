import { expect, test } from "@playwright/test";
import {
  createAndLoginUser,
  createTestEvent,
  grantPass,
} from "./fixtures/test-helpers";
import { serviceRoleClient } from "./fixtures/service-role";

test.describe("The Celebration Pass", () => {
  test("a free celebration shows what the pass unlocks, and the pass opens it", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await createAndLoginUser(page, context, "pass_host");
    const { eventId } = await createTestEvent(page, { free: true });
    const billing = new RegExp(`/events/${eventId}/billing`);

    // Door check-in: the pass card instead of the desk, with a way to unlock it.
    await page.goto(`/events/${eventId}/check-in`);
    const checkInLock = page.getByTestId("pass-lock-check-in");
    await expect(checkInLock).toBeVisible();
    await expect(
      checkInLock.getByRole("link", {
        name: /Unlock with the Celebration Pass/,
      })
    ).toHaveAttribute("href", billing);

    // Team: no invite button, a pass card in its place; the owner is still listed.
    await page.goto(`/events/${eventId}/team`);
    await expect(page.getByTestId("pass-lock-team")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Invite member" })
    ).toHaveCount(0);

    // Guest-list import.
    await page.goto(`/events/${eventId}/guests/import`);
    await expect(page.getByTestId("pass-lock-import")).toBeVisible();

    // The billing card lists the same things the pass unlocks.
    await page.goto(`/events/${eventId}/billing`);
    await expect(page.getByText(/The door check-in desk/)).toBeVisible();

    // The guest page carries the "Planned with Àríyá" line.
    const { data: guest } = await serviceRoleClient()
      .from("guests")
      .insert({ event_id: eventId, name: "Pass Guest", party_size: 1 })
      .select("rsvp_token")
      .single();
    await page.goto(`/i/${guest!.rsvp_token}`);
    const mark = page.getByTestId("guest-mark");
    await expect(mark).toContainText("Planned with Àríyá");
    await expect(
      mark.getByRole("link", { name: /Plan your own celebration/ })
    ).toHaveAttribute("href", "/");

    // With the pass, the same pages open as usual.
    await grantPass(eventId);
    await page.goto(`/events/${eventId}/check-in`);
    await expect(page.getByTestId("pass-lock-check-in")).toHaveCount(0);
    await page.goto(`/events/${eventId}/team`);
    await expect(page.getByTestId("pass-lock-team")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Invite member" }).first()
    ).toBeVisible();
    await page.goto(`/events/${eventId}/guests/import`);
    await expect(page.getByTestId("pass-lock-import")).toHaveCount(0);
  });

  test("the seating plan stays in Top view, and the 3D view asks for the pass", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await createAndLoginUser(page, context, "pass_hall");
    const { eventId } = await createTestEvent(page, { free: true });

    await page.goto(`/events/${eventId}/seating`);
    await expect(page.getByTestId("hall-studio")).toBeVisible({
      timeout: 30_000,
    });
    const camera = page.getByRole("radiogroup", { name: "Camera" });
    await expect(camera.getByRole("radio", { name: /Top/ })).toHaveAttribute(
      "aria-checked",
      "true",
      { timeout: 15_000 }
    );
    await camera.getByRole("radio", { name: /3D/ }).click();
    await expect(page.getByTestId("pass-lock-hall-3d")).toBeVisible();
    await page
      .getByRole("dialog", { name: "Celebration Pass" })
      .getByRole("button", { name: "Close" })
      .click();
    await expect(page.getByTestId("pass-lock-hall-3d")).toHaveCount(0);
    await expect(page.getByTestId("hall-share-locked")).toBeVisible();
  });
});
