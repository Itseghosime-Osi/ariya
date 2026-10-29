import http from "http";
import { test, expect } from "@playwright/test";
import {
  createAndLoginUser,
  createTestEvent,
  startMockPaystackServer,
  signPayload,
} from "./fixtures/test-helpers";

test.describe("Billing & Paystack Checkout", () => {
  let mockServer: http.Server;
  let getLastRef: () => string;
  let setAuthorized: (auth: boolean) => void;

  test.beforeAll(async () => {
    const mock = startMockPaystackServer(57328);
    mockServer = mock.server;
    getLastRef = mock.getLastRef;
    setAuthorized = mock.setAuthorized;

    await new Promise<void>((resolve) => {
      mockServer.listen(57328, "127.0.0.1", () => resolve());
    });
  });

  test.afterAll(async () => {
    if (mockServer) {
      await new Promise<void>((resolve) => {
        mockServer.close(() => resolve());
      });
    }
  });

  test("paystack checkout redirect, tampered signature rejection, valid webhook approval, and quota unlock", async ({
    page,
    context,
  }) => {
    await createAndLoginUser(page, context, "billing_owner");
    const { eventId } = await createTestEvent(page);

    // Navigate to billing
    await page.goto(`/events/${eventId}/billing`);
    await expect(page.getByText(/Free Tier \(Trial\)/i)).toBeVisible();

    // Click checkout
    await page.getByRole("button", { name: /pay with paystack/i }).click();

    // Redirect to mock checkout
    await page.waitForURL(/57328\/mock-checkout/, { timeout: 15000 });
    await expect(page.locator("h1")).toContainText(/Paystack Test Gateway/i);

    // Complete mock checkout redirecting back to callback
    await page.locator("#paystack-success-btn").click();
    await page.waitForURL(new RegExp(`/events/${eventId}/billing/callback`), {
      timeout: 15000,
    });

    const reference = getLastRef();
    const webhookPayload = JSON.stringify({
      event: "charge.success",
      data: {
        reference,
        amount: 5000000,
        currency: "NGN",
        status: "success",
        channel: "card",
      },
    });

    // Negative case: Tampered signature returns 401
    const tamperedRes = await page.request.post("/api/webhooks/paystack", {
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": "invalid_tampered_signature_hex",
      },
      data: webhookPayload,
    });
    expect(tamperedRes.status()).toBe(401);

    // Event stays unpaid
    await page.goto(`/events/${eventId}/billing`);
    await expect(page.getByText(/Free Tier \(Trial\)/i)).toBeVisible();

    // Positive case: Authorize on provider and deliver valid HMAC-SHA512 webhook
    setAuthorized(true);
    const validSignature = signPayload(webhookPayload);

    const webhookRes = await page.request.post("/api/webhooks/paystack", {
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": validSignature,
      },
      data: webhookPayload,
    });
    expect(webhookRes.status()).toBe(200);

    // Celebration Pass unlocked
    await page.goto(`/events/${eventId}/billing`);
    await expect(page.getByText(/Celebration Pass \(Unlocked\)/i)).toBeVisible({
      timeout: 15000,
    });

    // Quota banner unlocked on Invitations
    await page.goto(`/events/${eventId}/invitations`);
    await expect(
      page.getByText(/Free plan: \d+ of 20 invitations used/i)
    ).not.toBeVisible();
  });
});
