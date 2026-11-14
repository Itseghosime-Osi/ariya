import { afterEach, describe, expect, it, vi } from "vitest";
import { adm, adminBase, internalAdminPath, isHiddenAdminPath } from "./path";

describe("the admin desk's secret address", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is off without ADMIN_PATH", () => {
    vi.stubEnv("ADMIN_PATH", "");
    expect(adminBase()).toBeNull();
    expect(internalAdminPath("/anything")).toBeNull();
  });

  it("refuses short or guessable addresses", () => {
    for (const bad of [
      "/admin",
      "/admin-desk-2026",
      "/short",
      "no-slash-here-123",
      "/Dashboard-abcdefgh",
      "/has space here x",
    ]) {
      vi.stubEnv("ADMIN_PATH", bad);
      expect(adminBase(), bad).toBeNull();
    }
  });

  it("maps the secret address onto the internal pages and back", () => {
    vi.stubEnv("ADMIN_PATH", "/ojukoro-5k2m9q7d");
    expect(internalAdminPath("/ojukoro-5k2m9q7d")).toBe("/admin");
    expect(internalAdminPath("/ojukoro-5k2m9q7d/accounts/1")).toBe(
      "/admin/accounts/1"
    );
    expect(internalAdminPath("/ojukoro-5k2m9q7dx")).toBeNull();
    expect(adm("/admin")).toBe("/ojukoro-5k2m9q7d");
    expect(adm("/admin/events?filter=paid")).toBe(
      "/ojukoro-5k2m9q7d/events?filter=paid"
    );
    expect(adm("/administrator")).toBe("/administrator");
  });

  it("always hides the plain /admin address", () => {
    expect(isHiddenAdminPath("/admin")).toBe(true);
    expect(isHiddenAdminPath("/admin/log")).toBe(true);
    expect(isHiddenAdminPath("/administrators")).toBe(false);
  });
});
