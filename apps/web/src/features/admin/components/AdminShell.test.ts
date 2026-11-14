import { describe, expect, it } from "vitest";
import { ADMIN_NAV, isActive } from "./AdminShell";

describe("admin navigation", () => {
  it("marks Overview only on /admin itself", () => {
    expect(isActive("/admin", "/admin")).toBe(true);
    expect(isActive("/admin/accounts", "/admin")).toBe(false);
  });

  it("marks a section on its own page and the pages under it", () => {
    expect(isActive("/admin/accounts", "/admin/accounts")).toBe(true);
    expect(isActive("/admin/accounts/abc", "/admin/accounts")).toBe(true);
    expect(isActive("/admin/accountsx", "/admin/accounts")).toBe(false);
  });

  it("lists every section once", () => {
    const hrefs = ADMIN_NAV.map((n) => n.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toContain("/admin/log");
  });
});
