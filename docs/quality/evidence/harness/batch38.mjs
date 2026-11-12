import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const URL = "http://localhost:3000/documentation/zz-fixture?mode=pro";
for (const [w, h, touch] of [
  [360, 740, true],
  [390, 844, true],
  [1440, 900, false],
]) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const p = await (
    await b.newContext({
      viewport: { width: w, height: h },
      hasTouch: touch,
      isMobile: touch,
    })
  ).newPage();
  await p.goto(URL);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const bar = [...document.querySelectorAll("div")].find(
      (e) =>
        /fixed/.test(e.className) &&
        /bottom-0/.test(e.className) &&
        /h-14/.test(e.className)
    );
    const items = [...bar.querySelectorAll("button, select")]
      .filter((e) => e.getBoundingClientRect().width > 0)
      .map((e) => {
        const b = e.getBoundingClientRect();
        return {
          l: e.getAttribute("aria-label") || e.textContent.trim().slice(0, 12),
          w: Math.round(b.width),
          h: Math.round(b.height),
          r: Math.round(b.right),
        };
      });
    return {
      items,
      over: bar.scrollWidth > bar.clientWidth + 1,
      vw: innerWidth,
    };
  });
  const small = r.items.filter((x) => touch && (x.h < 44 || x.w < 36));
  check(
    `RD-E3-${w}`,
    `Bottom bar targets ${touch ? "are touch size" : "keep desktop size"} and fit`,
    !r.over && small.length === 0 && r.items.every((x) => x.r <= r.vw),
    JSON.stringify(small.length ? small : { n: r.items.length, over: r.over })
  );
  await p.screenshot({
    path: `/tmp/tidy-e3-${w}.png`,
    clip: { x: 0, y: h - 70, width: w, height: 70 },
  });
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch38.json",
  JSON.stringify(results, null, 2)
);
