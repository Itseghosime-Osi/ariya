import crypto from "crypto";

export interface PaystackVerifyResult {
  status: boolean;
  message: string;
  data?: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    channel: string;
    paid_at: string;
    customer?: {
      email: string;
    };
  };
}

export const CELEBRATION_PASS_AMOUNT_KOBO = 5000000; // 50,000 NGN
export const CELEBRATION_PASS_CURRENCY = "NGN";

/**
 * Verify Paystack webhook signature using constant-time HMAC-SHA512 comparison.
 */
export function verifyPaystackWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  const hash = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  const expectedBuf = Buffer.from(hash, "utf8");
  const actualBuf = Buffer.from(signatureHeader, "utf8");

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Verify transaction directly with Paystack API.
 */
export async function verifyPaystackTransaction(
  reference: string,
  secretKey: string
): Promise<PaystackVerifyResult> {
  const url = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      status: false,
      message: `Paystack API returned HTTP ${response.status}`,
    };
  }

  return (await response.json()) as PaystackVerifyResult;
}
