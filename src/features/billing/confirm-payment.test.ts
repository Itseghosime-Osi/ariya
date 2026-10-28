import { describe, it, expect, vi, beforeEach } from "vitest";
import { confirmPayment } from "./confirm-payment";
import type { PaystackVerifyResult } from "@/lib/paystack";

// Mock Supabase admin client
const mockRpc = vi.fn();
const mockMaybeSingle = vi.fn();
const mockEqSecond = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockEqFirst = vi.fn(() => ({
  maybeSingle: mockMaybeSingle,
  eq: mockEqSecond,
}));
const mockSelect = vi.fn(() => ({ eq: mockEqFirst }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

describe("confirmPayment", () => {
  const reference = "ary_test_ref_12345";
  const validProviderData: PaystackVerifyResult = {
    status: true,
    message: "Verification successful",
    data: {
      id: 999,
      status: "success",
      reference,
      amount: 5000000,
      currency: "NGN",
      channel: "card",
      paid_at: new Date().toISOString(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles unknown payment reference by returning notFound and status 200", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await confirmPayment(reference, validProviderData);
    expect(res.success).toBe(false);
    expect(res.notFound).toBe(true);
    expect(res.status).toBe(200);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 500 when database error occurs during payment query", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "db disconnect" },
    });

    const res = await confirmPayment(reference, validProviderData);
    expect(res.success).toBe(false);
    expect(res.status).toBe(500);
    expect(res.error).toBe("Internal server error");
  });

  it("returns 400 when provider verification is unsuccessful or not approved", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "p1",
        event_id: "e1",
        amount_kobo: 5000000,
        status: "pending",
      },
      error: null,
    });

    const failedProvider: PaystackVerifyResult = {
      status: false,
      message: "Declined",
    };

    const res = await confirmPayment(reference, failedProvider);
    expect(res.success).toBe(false);
    expect(res.status).toBe(400);
    expect(res.error).toContain("Payment verification failed with provider");
  });

  it("returns 422 when amount does not match stored payment amount_kobo exactly", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "p1",
        event_id: "e1",
        amount_kobo: 5000000,
        status: "pending",
      },
      error: null,
    });

    const mismatchedAmount: PaystackVerifyResult = {
      ...validProviderData,
      data: {
        ...validProviderData.data!,
        amount: 3000000, // Tampered amount
      },
    };

    const res = await confirmPayment(reference, mismatchedAmount);
    expect(res.success).toBe(false);
    expect(res.status).toBe(422);
    expect(res.error).toContain("Payment verification attributes mismatch");
  });

  it("returns 422 when currency is not NGN", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "p1",
        event_id: "e1",
        amount_kobo: 5000000,
        status: "pending",
      },
      error: null,
    });

    const mismatchedCurrency: PaystackVerifyResult = {
      ...validProviderData,
      data: {
        ...validProviderData.data!,
        currency: "USD",
      },
    };

    const res = await confirmPayment(reference, mismatchedCurrency);
    expect(res.success).toBe(false);
    expect(res.status).toBe(422);
  });

  it("successfully updates payment via record_successful_payment and returns eventId", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "p1",
        event_id: "e1",
        amount_kobo: 5000000,
        status: "pending",
      },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({
      data: { success: true, event_id: "e1" },
      error: null,
    });

    const res = await confirmPayment(reference, validProviderData);
    expect(res.success).toBe(true);
    expect(res.status).toBe(200);
    expect(res.eventId).toBe("e1");
    expect(mockRpc).toHaveBeenCalledWith("record_successful_payment", {
      p_payment_reference: reference,
      p_paystack_data: validProviderData.data,
    });
  });
});
