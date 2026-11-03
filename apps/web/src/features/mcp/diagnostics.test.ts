import { describe, it, expect } from "vitest";
import {
  diagnosticNote,
  diagnosticOf,
  describeDiagnostic,
} from "./diagnostics";

describe("diagnosticOf", () => {
  it("keeps a SQLSTATE and one of the hint tokens our RPCs raise", () => {
    expect(
      diagnosticOf({ code: "42501", hint: "NOT_PERMITTED", message: "raw" })
    ).toEqual({ code: "42501", hint: "NOT_PERMITTED" });
  });

  it("keeps the code when the hint is not a token", () => {
    expect(
      diagnosticOf({
        code: "23505",
        hint: "Guest Ada Obi is already seated at Table 3",
      })
    ).toEqual({ code: "23505" });
  });

  it("keeps the code when there is no hint at all", () => {
    expect(diagnosticOf({ code: "23503" })).toEqual({ code: "23503" });
  });

  it("never carries the database message", () => {
    const diagnostic = diagnosticOf({
      code: "42501",
      message:
        'new row violates row-level security policy for table "ai_proposals"',
    });

    expect(diagnostic).toEqual({ code: "42501" });
    expect(JSON.stringify(diagnostic)).not.toContain("row-level");
  });

  it("drops anything that is not a SQLSTATE", () => {
    // PostgREST's own codes are not SQLSTATEs, and a string is not an error object.
    expect(
      diagnosticOf({ code: "PGRST116", hint: "NOT_PERMITTED" })
    ).toBeNull();
    expect(diagnosticOf({ code: "not a code" })).toBeNull();
    expect(diagnosticOf({ hint: "NOT_PERMITTED" })).toBeNull();
    expect(diagnosticOf("42501")).toBeNull();
    expect(diagnosticOf(null)).toBeNull();
    expect(diagnosticOf(undefined)).toBeNull();
  });
});

describe("describeDiagnostic", () => {
  it("joins the code and the hint", () => {
    expect(describeDiagnostic({ code: "42501", hint: "NOT_PERMITTED" })).toBe(
      "42501 NOT_PERMITTED"
    );
  });

  it("is the code alone when there is no hint", () => {
    expect(describeDiagnostic({ code: "23503" })).toBe("23503");
  });
});

describe("diagnosticNote", () => {
  it("appends the code to the note the host already reads", () => {
    expect(
      diagnosticNote("Proposed a hall layout", {
        code: "42501",
        hint: "NOT_PERMITTED",
      })
    ).toBe("Proposed a hall layout (42501 NOT_PERMITTED)");
  });

  it("is the code alone when the call kept no note", () => {
    expect(diagnosticNote(null, { code: "23514" })).toBe("23514");
    expect(diagnosticNote(undefined, { code: "23514" })).toBe("23514");
  });

  it("leaves the note untouched when the database said nothing", () => {
    expect(diagnosticNote("Listed the guests", null)).toBe("Listed the guests");
    expect(diagnosticNote(null, null)).toBeNull();
  });
});
