import { describe, it, expect } from "vitest";
import { mapError } from "./errors";

describe("mapError", () => {
  it("maps invalid credentials", () => {
    expect(mapError({ message: "Invalid login credentials" })).toContain(
      "Invalid email or password"
    );
    expect(mapError("invalid_credentials")).toContain(
      "Invalid email or password"
    );
  });

  it("maps user already registered", () => {
    expect(mapError({ message: "User already registered" })).toContain(
      "account with this email address already exists"
    );
  });

  it("maps weak password", () => {
    expect(
      mapError({ message: "Password should be at least 6 characters" })
    ).toContain("Password is too weak");
  });

  it("maps rate limiting", () => {
    expect(mapError({ message: "over_email_send_rate_limit" })).toContain(
      "Too many requests"
    );
  });

  it("maps unconfirmed email", () => {
    expect(mapError({ message: "Email not confirmed" })).toContain(
      "email address has not been confirmed"
    );
  });

  it("maps database unique violation", () => {
    expect(
      mapError({ code: "23505", message: "duplicate key error on slug" })
    ).toContain("An event with a similar title already exists");
  });

  it("maps permission errors", () => {
    expect(mapError({ code: "42501", message: "permission denied" })).toBe(
      "You do not have permission to perform this action."
    );
  });

  it("returns fallback for unknown errors", () => {
    expect(
      mapError(
        new Error("unhandled low level connection error"),
        "Custom fallback"
      )
    ).toBe("Custom fallback");
  });
});
