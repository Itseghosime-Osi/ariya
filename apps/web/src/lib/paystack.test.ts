import crypto from "crypto";
import { describe, it, expect } from "vitest";
import {
  verifyPaystackWebhookSignature,
  CELEBRATION_PASS_AMOUNT_KOBO,
  CELEBRATION_PASS_CURRENCY,
} from "./paystack";

describe("Paystack webhook signature verification", () => {
  const secret = "sk_test_mock_secret_key_1234567890abcdef";
  const payload = JSON.stringify({
    event: "charge.success",
    data: {
      reference: "ARY-PAY-12345",
      amount: CELEBRATION_PASS_AMOUNT_KOBO,
      currency: CELEBRATION_PASS_CURRENCY,
      status: "success",
    },
  });

  it("successfully validates authentic Paystack HMAC-SHA512 signature", () => {
    const validSignature = crypto
      .createHmac("sha512", secret)
      .update(payload)
      .digest("hex");

    const isValid = verifyPaystackWebhookSignature(
      payload,
      validSignature,
      secret
    );
    expect(isValid).toBe(true);
  });

  it("rejects tampered payload with valid original signature", () => {
    const validSignature = crypto
      .createHmac("sha512", secret)
      .update(payload)
      .digest("hex");

    const tamperedPayload = payload.replace("ARY-PAY-12345", "ARY-PAY-99999");
    const isValid = verifyPaystackWebhookSignature(
      tamperedPayload,
      validSignature,
      secret
    );
    expect(isValid).toBe(false);
  });

  it("rejects signature created with wrong secret", () => {
    const wrongSignature = crypto
      .createHmac("sha512", "wrong_secret_key")
      .update(payload)
      .digest("hex");

    const isValid = verifyPaystackWebhookSignature(
      payload,
      wrongSignature,
      secret
    );
    expect(isValid).toBe(false);
  });

  it("rejects null or empty signature headers gracefully", () => {
    expect(verifyPaystackWebhookSignature(payload, null, secret)).toBe(false);
    expect(verifyPaystackWebhookSignature(payload, "", secret)).toBe(false);
    expect(verifyPaystackWebhookSignature(payload, "invalid_len", secret)).toBe(
      false
    );
  });
});
