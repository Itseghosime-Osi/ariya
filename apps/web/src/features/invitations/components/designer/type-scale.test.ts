import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The studio's type scale: 12 (labels, notes), 14 (body), 16 (titles and phone inputs),
 * 20 and 24 (dialog headings). In Tailwind those are text-xs, text-sm, text-base, text-xl and
 * text-2xl. This keeps stray sizes (13px, 15px, 17px, 18px...) from creeping back in.
 *
 * Not covered on purpose: the ruler tick labels (8 and 9 px SVG text inside 24 to 26 px strips)
 * are drawing measurements, not interface text.
 */
const here = __dirname;
const sources = readdirSync(here)
  .filter((f) => /\.(tsx|css)$/.test(f) && !/\.test\./.test(f))
  .map((f) => ({ name: f, text: readFileSync(join(here, f), "utf8") }))
  .concat([
    {
      name: "seating/hall/studio-ui.tsx",
      text: readFileSync(
        join(here, "../../../seating/hall/studio-ui.tsx"),
        "utf8"
      ),
    },
  ]);

describe("studio type scale", () => {
  it("uses no arbitrary pixel text sizes in class names", () => {
    const hits = sources.flatMap(({ name, text }) =>
      [...text.matchAll(/\btext-\[\d+(?:\.\d+)?px\]/g)].map(
        (m) => `${name}: ${m[0]}`
      )
    );
    expect(hits).toEqual([]);
  });

  it("uses only the scale's named sizes", () => {
    const hits = sources.flatMap(({ name, text }) =>
      [...text.matchAll(/\btext-(lg|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/g)].map(
        (m) => `${name}: ${m[0]}`
      )
    );
    expect(hits).toEqual([]);
  });

  it("keeps stylesheet font sizes on the scale", () => {
    const css = sources.filter((s) => s.name.endsWith(".css"));
    const sizes = css.flatMap(({ text }) =>
      [...text.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) =>
        Number(m[1])
      )
    );
    expect(sizes.length).toBeGreaterThan(0);
    for (const s of sizes) expect([12, 14, 16, 20, 24]).toContain(s);
  });
});
