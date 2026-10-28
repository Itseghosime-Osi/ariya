import { describe, it, expect } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  describe("allows valid internal paths", () => {
    it("allows standard relative paths", () => {
      expect(safeRedirectPath("/events")).toBe("/events");
      expect(safeRedirectPath("/events/a000-1111")).toBe("/events/a000-1111");
      expect(safeRedirectPath("/events/create")).toBe("/events/create");
    });

    it("preserves valid query params and hashes", () => {
      expect(safeRedirectPath("/events?view=seating")).toBe(
        "/events?view=seating"
      );
      expect(safeRedirectPath("/events/123?tab=guests#table-4")).toBe(
        "/events/123?tab=guests#table-4"
      );
    });

    it("respects custom fallback when next is null or empty", () => {
      expect(safeRedirectPath(null, "/custom")).toBe("/custom");
      expect(safeRedirectPath(undefined, "/custom")).toBe("/custom");
      expect(safeRedirectPath("", "/custom")).toBe("/custom");
      expect(safeRedirectPath("   ", "/custom")).toBe("/custom");
    });
  });

  describe("rejects protocol-relative and backslash paths", () => {
    it("rejects protocol-relative URLs", () => {
      expect(safeRedirectPath("//evil.com")).toBe("/events");
      expect(safeRedirectPath("///evil.com")).toBe("/events");
      expect(safeRedirectPath("//google.com/phishing")).toBe("/events");
    });

    it("rejects backslash escaping", () => {
      expect(safeRedirectPath("/\\evil.com")).toBe("/events");
      expect(safeRedirectPath("\\evil.com")).toBe("/events");
      expect(safeRedirectPath("/\\/evil.com")).toBe("/events");
    });
  });

  describe("rejects external schemes and URLs", () => {
    it("rejects absolute URLs with http/https schemes", () => {
      expect(safeRedirectPath("https://evil.com")).toBe("/events");
      expect(safeRedirectPath("http://attacker.org/steal")).toBe("/events");
      expect(safeRedirectPath("ftp://malicious.net")).toBe("/events");
    });

    it("rejects javascript: and data: pseudo-protocols", () => {
      expect(safeRedirectPath("javascript:alert(1)")).toBe("/events");
      expect(safeRedirectPath("data:text/html;base64,PHNjcmlwdD4=")).toBe(
        "/events"
      );
      expect(safeRedirectPath("vbscript:MsgBox(1)")).toBe("/events");
    });
  });

  describe("rejects percent-encoded evasion attempts", () => {
    it("rejects encoded slashes attempting protocol-relative bypass", () => {
      expect(safeRedirectPath("/%2fevil.com")).toBe("/events");
      expect(safeRedirectPath("/%2Fevil.com")).toBe("/events");
      expect(safeRedirectPath("/%2f%2fevil.com")).toBe("/events");
    });

    it("rejects encoded backslashes attempting bypass", () => {
      expect(safeRedirectPath("/%5cevil.com")).toBe("/events");
      expect(safeRedirectPath("/%5Cevil.com")).toBe("/events");
      expect(safeRedirectPath("/%5c%5cevil.com")).toBe("/events");
    });

    it("rejects malformed percent-encoded input", () => {
      expect(safeRedirectPath("/%ZZevil")).toBe("/events");
    });
  });

  describe("rejects control characters and CRLF injection", () => {
    it("rejects newlines and carriage returns", () => {
      expect(safeRedirectPath("/events\r\nSet-Cookie:evil=true")).toBe(
        "/events"
      );
      expect(safeRedirectPath("/events\nevil")).toBe("/events");
      expect(safeRedirectPath("/events\0evil")).toBe("/events");
    });
  });
});
