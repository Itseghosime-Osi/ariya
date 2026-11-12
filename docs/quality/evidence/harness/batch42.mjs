import pw from "/opt/node-tools/node_modules/playwright/index.js";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const Axe = AxeBuilder.default ?? AxeBuilder;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
for (const w of [360, 390]) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const p = await (
    await b.newContext({
      viewport: { width: w, height: 800 },
      hasTouch: true,
      isMobile: true,
    })
  ).newPage();
  await p.goto("http://localhost:3000/documentation/zz-fixture?mode=pro");
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const row = document.querySelector('[aria-label="Studio panels"]');
    const btns = [...row.querySelectorAll("button")].map((e) => {
      const b = e.getBoundingClientRect();
      return {
        t: e.textContent,
        w: Math.round(b.width),
        h: Math.round(b.height),
        clipped: e.scrollWidth > e.clientWidth + 1,
        bg: getComputedStyle(e).backgroundColor,
      };
    });
    return { btns, over: row.scrollWidth > row.clientWidth + 1 };
  });
  check(
    `RD-G2-${w}`,
    "Five phone tabs fit without clipping and have a resting background",
    !r.over &&
      r.btns.length === 5 &&
      r.btns.every(
        (x) => !x.clipped && x.h >= 38 && x.bg !== "rgba(0, 0, 0, 0)"
      ),
    JSON.stringify(r.btns.map((x) => `${x.t}:${x.w}x${x.h}`))
  );
  const ax = await new Axe({ page: p })
    .withTags(["wcag2a", "wcag2aa"])
    .include('[aria-label="Studio panels"]')
    .analyze();
  const bad = ax.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact)
  );
  check(
    `RD-G2-axe-${w}`,
    "Tab contrast and names pass axe",
    bad.length === 0,
    bad.map((v) => v.id).join(",")
  );
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch42.json",
  JSON.stringify(results, null, 2)
);
