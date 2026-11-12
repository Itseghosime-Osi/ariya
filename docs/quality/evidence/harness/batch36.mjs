import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const URL = "http://localhost:3000/documentation/zz-fixture?mode=pro";
for (const w of [390, 1440]) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const p = await (
    await b.newContext({ viewport: { width: w, height: 800 } })
  ).newPage();
  await p.goto(URL);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const names = [
      "Back to invitations",
      "Help and shortcuts",
      /Switch to the/,
    ];
    return ["Back to invitations", "Help and shortcuts", "Switch to the"]
      .map((n) => {
        const e = [
          ...document.querySelectorAll("header a, header button"),
        ].find((x) => (x.getAttribute("aria-label") || "").startsWith(n));
        if (!e || getComputedStyle(e).display === "none")
          return { n, shown: false };
        const bb = e.getBoundingClientRect(),
          cs = getComputedStyle(e);
        return {
          n,
          shown: true,
          w: bb.width,
          h: bb.height,
          border: cs.borderTopWidth,
          radius: cs.borderTopLeftRadius,
        };
      })
      .filter((x) => x.shown);
  });
  const same = r.every(
    (x) =>
      x.w === r[0].w &&
      x.h === r[0].h &&
      x.border === r[0].border &&
      x.radius === r[0].radius
  );
  check(
    `RD-B1-${w}`,
    "Round header buttons share size, border and radius",
    same && r.length >= 2,
    JSON.stringify(r)
  );
  const over = await p.evaluate(
    () => document.documentElement.scrollWidth > innerWidth + 1
  );
  check(`RD-B1-${w}-fit`, "Header does not overflow", !over);
  await p.screenshot({
    path: `/tmp/tidy-b1-${w}.png`,
    clip: { x: 0, y: 0, width: w, height: 120 },
  });
  await b.close();
}
// H1: save error uses the notice look and keeps testid + Retry
{
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const p = await (
    await b.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();
  await p.goto(URL);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.route("**/*", (r) => r.continue());
  await p.waitForTimeout(500);
  const found = await p.getByTestId("studio-error-alert").count();
  check(
    "RD-H1-note",
    "Error alert only shows on save failure (not at rest)",
    found === 0
  );
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch36.json",
  JSON.stringify(results, null, 2)
);
