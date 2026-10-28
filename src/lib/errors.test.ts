import { describe, it, expect, vi } from "vitest";
import { mapError } from "./errors";

describe("mapError", () => {
  it("maps structured HINT CAPACITY_EXCEEDED with whitelisted detail", () => {
    const errorWithDetail = {
      code: "P0001",
      hint: "CAPACITY_EXCEEDED",
      message: "Table capacity exceeded. Available: 2, required: 3",
    };
    expect(mapError(errorWithDetail)).toBe(
      "Table capacity exceeded. Only 2 seats available."
    );

    const errorSingular = {
      code: "P0001",
      hint: "CAPACITY_EXCEEDED",
      message: "Table capacity exceeded. Available: 1, required: 2",
    };
    expect(mapError(errorSingular)).toBe(
      "Table capacity exceeded. Only 1 seat available."
    );

    const errorGeneric = {
      code: "P0001",
      hint: "CAPACITY_EXCEEDED",
      message: "Exceeded table limits",
    };
    expect(mapError(errorGeneric)).toBe(
      "Table capacity exceeded for this assignment."
    );
  });

  it("maps structured HINT codes for database exceptions", () => {
    expect(
      mapError({ code: "P0001", hint: "NOT_PERMITTED", message: "Denied" })
    ).toBe("You do not have permission to perform this action.");

    expect(
      mapError({ code: "P0001", hint: "RSVP_CLOSED", message: "Closed" })
    ).toBe("This celebration is no longer accepting RSVP responses.");

    expect(
      mapError({
        code: "P0001",
        hint: "RSVP_DEADLINE_PASSED",
        message: "Passed",
      })
    ).toBe("The RSVP deadline for this celebration has passed.");

    expect(
      mapError({
        code: "P0001",
        hint: "ATTENDEE_COUNT_INVALID",
        message: "Invalid",
      })
    ).toBe("The requested attendee count is not permitted for this party.");
  });

  it("never exposes 'new row violates row-level security policy' to users", () => {
    // When code 42501 accompanies the internal Postgres RLS error message
    const rlsErrorWithCode = {
      code: "42501",
      message: 'new row violates row-level security policy for table "guests"',
    };
    const res1 = mapError(rlsErrorWithCode);
    expect(res1).not.toContain("row-level security policy");
    expect(res1).not.toContain("new row violates");
    expect(res1).toBe("You do not have permission to perform this action.");

    // Even without an explicit code, unknown raw string error never leaks
    const rlsRawError = {
      message: 'new row violates row-level security policy for table "guests"',
    };
    const res2 = mapError(rlsRawError, "Could not save guest record");
    expect(res2).not.toContain("row-level security policy");
    expect(res2).not.toContain("new row violates");
    expect(res2).toBe("Could not save guest record");
  });

  it("logs unknown errors server-side and returns fallback", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const unknownError = new Error("Database network socket closed abruptly");

    const res = mapError(unknownError, "Service temporarily unavailable");
    expect(res).toBe("Service temporarily unavailable");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[mapError] Unhandled error:",
      expect.objectContaining({
        message: "Database network socket closed abruptly",
      })
    );
    consoleSpy.mockRestore();
  });

  it("maps Supabase Auth errors", () => {
    expect(mapError({ code: "invalid_credentials" })).toContain(
      "Invalid email or password"
    );
    expect(mapError({ message: "Invalid login credentials" })).toContain(
      "Invalid email or password"
    );
    expect(mapError({ code: "user_already_exists" })).toContain(
      "account with this email address already exists"
    );
  });
});
