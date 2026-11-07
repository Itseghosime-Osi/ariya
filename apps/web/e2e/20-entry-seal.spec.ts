import path from "node:path";
import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";
import { serviceRoleClient } from "./fixtures/service-role";

// The same decoder the door scanner falls back to on phones without BarcodeDetector.
const ZXING = path.resolve(
  process.cwd(),
  "../../node_modules/.pnpm/@zxing+library@0.23.0/node_modules/@zxing/library/umd/index.min.js"
);

test.describe("The entry seal", () => {
  test("the code is woven into the invitation, scans, and is never shown as a QR", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "seal_host");
    const { eventId } = await createTestEvent(page);

    await page.goto(`/events/${eventId}/guests`);
    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .locator('input[placeholder="Chief Olawale Adeyemi"]')
      .fill("Chidi Okafor");
    await page.getByRole("button", { name: /add to guestbook/i }).click();
    await page.getByText("Chidi Okafor").first().click();
    await page
      .getByRole("button", { name: /copy link/i })
      .first()
      .click();
    const inviteUrl = await page.evaluate(() => navigator.clipboard.readText());

    // The host opens the designer; the seal is placed for them.
    // The access pass is on by default, so the designer puts the seal on the card for the host.
    await page.goto(`/events/${eventId}/invitations/design`);
    await expect(page.getByText(/· saved$/i)).toBeVisible({
      timeout: 15000,
    });

    // The guest accepts and is given the invitation, not a QR box.
    await page.goto(inviteUrl);
    await page.getByLabel(/Joyfully Accept/i).check();
    await page.getByRole("button", { name: /submit rsvp response/i }).click();
    await expect(page.getByText(/RSVP Confirmed & Honoured/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/Personal Entry Code/i)).toHaveCount(0);
    await expect(page.getByAltText(/QR Pass/i)).toHaveCount(0);
    const seal = page.locator("[data-entry-seal]").first();
    await expect(seal).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save my invitation/i })
    ).toBeVisible();

    // The seal decodes to this guest's code, exactly what the check-in desk reads.
    const { data } = await serviceRoleClient()
      .from("guests")
      .select("check_in_code")
      .eq("event_id", eventId)
      .single();
    await page.addScriptTag({ path: ZXING });
    const decoded = await page.evaluate(async () => {
      const svg = document.querySelector("[data-entry-seal] svg");
      if (!svg) return null;
      const xml = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 600;
      canvas.getContext("2d")!.drawImage(img, 0, 0, 600, 600);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Z = (window as any).ZXing;
      const luminance = new Z.HTMLCanvasElementLuminanceSource(canvas);
      const bitmap = new Z.BinaryBitmap(new Z.HybridBinarizer(luminance));
      return new Z.QRCodeReader().decode(bitmap).getText();
    });
    expect(decoded).toBe(data?.check_in_code);

    // And saving the invitation downloads a picture.
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /save my invitation/i }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("invitation-Chidi-Okafor.png");
  });
});
