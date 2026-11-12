import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The studio's stacking order, shadows, control radius and stylesheet spacing live in
 * `styles/globals.css` as `--studio-*` variables. This keeps one-off numbers from coming back.
 */
const sources = readdirSync(__dirname)
  .filter((f) => /\.(tsx|css)$/.test(f) && !/\.test\./.test(f))
  .map((f) => ({ name: f, text: readFileSync(join(__dirname, f), "utf8") }));
const tsx = sources.filter((s) => s.name.endsWith(".tsx"));
const css = sources.filter((s) => s.name.endsWith(".css"));

const find = (list: typeof sources, re: RegExp) =>
  list.flatMap(({ name, text }) =>
    [...text.matchAll(re)].map((m) => `${name}: ${m[0]}`)
  );

describe("studio tokens", () => {
  it("uses named stacking layers, not z-10, z-50 and the like", () => {
    expect(find(tsx, /(?<![\w-])z-(?:\[\d+\]|\d+)(?![\w\]])/g)).toEqual([]);
    expect(find(css, /z-index:\s*\d+/g)).toEqual([]);
  });

  it("uses named shadows for anything beyond Tailwind's own scale", () => {
    expect(find(tsx, /\bshadow-\[[^\]]*\]/g)).toEqual([]);
    expect(find(css, /box-shadow:\s+(?!none|var\()[^;]+/g)).toEqual([]);
  });

  it("uses the control radius token, not a literal 10px", () => {
    expect(find(tsx, /rounded-\[10px\]/g)).toEqual([]);
  });

  it("keeps stylesheet spacing on the 4/8 scale", () => {
    expect(find(css, /\b(?:gap|padding|margin):[^;]*\b(?:20|10|6)px/g)).toEqual(
      []
    );
  });
});
