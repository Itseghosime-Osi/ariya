import { describe, expect, it } from "vitest";
import { adm } from "./path";

describe("the admin desk's address", () => {
  it("is /admin itself", () => {
    expect(adm("/admin")).toBe("/admin");
    expect(adm("/admin/events?filter=paid")).toBe("/admin/events?filter=paid");
  });
});
