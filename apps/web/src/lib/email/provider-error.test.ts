import { describe, expect, it } from "vitest";
import { emailFailureReason } from "./provider-error";

describe("email provider rejection categories", () => {
  it("recognises a domain rejection without exposing its content", () => {
    expect(
      emailFailureReason(
        "The ariyaday.com domain is not verified. Please add and verify your domain."
      )
    ).toBe("domain_unverified");
  });
  it("recognises test restrictions before the suggested domain-verification remedy", () => {
    expect(
      emailFailureReason(
        "You can only send testing emails to your own email address (owner@example.com). To send emails to other recipients, please verify a domain."
      )
    ).toBe("test_recipients_only");
  });
  it("recognises invalid address messages", () => {
    expect(
      emailFailureReason(
        "Invalid `to` field: invalid email address at position 0."
      )
    ).toBe("invalid_address");
  });
  it("does not invent a cause for an unknown validation failure", () => {
    expect(emailFailureReason("Missing subject field")).toBeUndefined();
    expect(emailFailureReason()).toBeUndefined();
  });
});
