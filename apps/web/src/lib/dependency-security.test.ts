// Exercise the actual transitive dependency used by email rendering.
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
const renderRequire = createRequire(
  require.resolve("@react-email/render", {
    paths: [require.resolve("@react-email/components")],
  })
);
const htmlRequire = createRequire(renderRequire.resolve("html-to-text"));
const merge = htmlRequire("deepmerge");

describe("email dependency prototype-poisoning regression", () => {
  it("does not inherit attacker properties from the target object", () => {
    const target = JSON.parse('{"__proto__":{"admin":true}}');
    const result = merge(target, { safe: "value" });
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result.admin).toBeUndefined();
    expect(result.safe).toBe("value");
  });
  it("does not invoke prototype setters when merging into a null-prototype object", () => {
    const source = JSON.parse('{"__proto__":{"admin":true}}');
    const result = merge(Object.create(null), source);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result.admin).toBeUndefined();
  });
  it("preserves normal nested email configuration merges", () => {
    expect(
      merge({ options: { width: 80 } }, { options: { wrap: true } })
    ).toEqual({ options: { width: 80, wrap: true } });
  });
});
