import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});
const p = await (
  await b.newContext({ viewport: { width: 1440, height: 1000 } })
).newPage();
await p.goto("http://localhost:3000/documentation/zz-fixture?mode=pro");
await p
  .getByTestId("designer-stage")
  .locator("[data-invitation-canvas]")
  .waitFor();
await p.waitForTimeout(900);
const r = await p.evaluate(() => {
  const tb = document.querySelector(
    '[role="toolbar"][aria-label="Design tools"]'
  );
  const kids = [...tb.children].map((c) => {
    const r = c.getBoundingClientRect();
    return {
      sep: c.getAttribute("aria-hidden") === "true" && r.height <= 2,
      top: r.top,
      bottom: r.bottom,
    };
  });
  const gaps = [];
  kids.forEach((k, i) => {
    if (k.sep && kids[i - 1] && kids[i + 1])
      gaps.push([
        Math.round(k.top - kids[i - 1].bottom),
        Math.round(kids[i + 1].top - k.bottom),
      ]);
  });
  const icons = [...tb.querySelectorAll("button svg")].map((s) => ({
    w: s.getAttribute("width"),
    sw: s.getAttribute("stroke-width"),
    fill: s.getAttribute("fill"),
  }));
  const grad = tb.querySelector('button[aria-label="Gradient Fill"] > span');
  return {
    gaps,
    nIcons: icons.length,
    sizes: [...new Set(icons.map((i) => i.w))],
    strokes: [...new Set(icons.map((i) => i.sw))],
    gradBorder: grad ? getComputedStyle(grad).borderTopWidth : null,
  };
});
check(
  "RD-C4",
  "Space above and below every divider is the same",
  r.gaps.length > 0 && r.gaps.every(([a, c]) => a === c),
  JSON.stringify(r.gaps)
);
check(
  "RD-C1",
  "Tool icons share one size and stroke; the gradient tool is an outline with a small gradient",
  r.sizes.length === 1 &&
    r.strokes.length === 1 &&
    parseFloat(r.gradBorder) >= 1,
  JSON.stringify({
    sizes: r.sizes,
    strokes: r.strokes,
    gradBorder: r.gradBorder,
  })
);
// C2: one state set
const states = await p.evaluate(() => {
  const tb = document.querySelector(
    '[role="toolbar"][aria-label="Design tools"]'
  );
  const btns = [...tb.querySelectorAll(":scope > div > button")];
  const on = btns.find((x) => x.getAttribute("aria-pressed") === "true");
  const off = btns.filter((x) => x.getAttribute("aria-pressed") === "false");
  const cs = (e) => ({
    w: e.getBoundingClientRect().width,
    h: e.getBoundingClientRect().height,
    r: getComputedStyle(e).borderTopLeftRadius,
  });
  return {
    on: on ? cs(on) : null,
    offSizes: [...new Set(off.map((e) => JSON.stringify(cs(e))))],
  };
});
check(
  "RD-C2",
  "Active and resting tools share size and corner shape",
  states.on &&
    states.offSizes.length === 1 &&
    JSON.stringify(states.on) === states.offSizes[0],
  JSON.stringify(states)
);
await p.screenshot({
  path: "/tmp/tidy-c-after.png",
  clip: { x: 0, y: 100, width: 80, height: 900 },
});
await b.close();
writeFileSync(
  process.argv[2] ?? "/tmp/batch43.json",
  JSON.stringify(results, null, 2)
);
