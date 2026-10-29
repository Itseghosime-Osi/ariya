import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("web app manifest", () => {
  const m = manifest();

  it("opens full screen, without browser chrome", () => {
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/events");
    expect(m.scope).toBe("/");
  });

  it("has the names and colours the install prompt needs", () => {
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("ships 192 and 512 icons plus a maskable one, all present on disk", () => {
    const icons = m.icons ?? [];
    expect(icons.some((i) => i.sizes === "192x192")).toBe(true);
    expect(icons.some((i) => i.sizes === "512x512" && !i.purpose)).toBe(true);
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
    for (const icon of icons) {
      const file = path.join(process.cwd(), "public", icon.src);
      expect(fs.existsSync(file), `${icon.src} is missing`).toBe(true);
    }
  });

  it("only offers shortcuts that stay inside the app", () => {
    for (const shortcut of m.shortcuts ?? []) {
      expect(shortcut.url.startsWith("/")).toBe(true);
    }
  });
});
