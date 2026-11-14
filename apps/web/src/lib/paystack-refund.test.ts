import { afterEach, describe, expect, it, vi } from "vitest";
import { createPaystackRefund } from "./paystack";

describe("createPaystackRefund", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks Paystack to refund the transaction by reference, with the secret key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: true,
          message: "Refund has been queued",
          data: { id: 7, status: "pending" },
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await createPaystackRefund(
      "ref_123",
      "sk_test_x",
      "https://paystack.test/"
    );
    expect(res.status).toBe(true);
    expect(res.data?.id).toBe(7);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://paystack.test/refund");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer sk_test_x");
    expect(JSON.parse(init.body)).toEqual({ transaction: "ref_123" });
  });

  it("reports Paystack's own message when it refuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: false,
            message: "Transaction has been fully reversed",
          }),
          { status: 400 }
        )
      )
    );
    const res = await createPaystackRefund("ref_123", "sk_test_x");
    expect(res).toEqual({
      status: false,
      message: "Transaction has been fully reversed",
    });
  });

  it("does not throw when Paystack answers with something that is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Bad gateway", { status: 502 }))
    );
    const res = await createPaystackRefund("ref_123", "sk_test_x");
    expect(res.status).toBe(false);
    expect(res.message).toContain("502");
  });
});
