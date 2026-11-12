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
// J2: every tool button that has a shortcut shows it in its tooltip
const tools = await p.evaluate(() =>
  [
    ...document.querySelectorAll(
      '[role="toolbar"][aria-label="Design tools"] button'
    ),
  ].map((e) => ({
    label: e.getAttribute("aria-label"),
    sc: e.getAttribute("aria-keyshortcuts"),
    title: e.getAttribute("title"),
  }))
);
const withSc = tools.filter((t) => t.sc);
check(
  "RD-J2",
  "Every tool with a keyboard shortcut shows it in its tooltip",
  withSc.length >= 11 &&
    withSc.every((t) => t.title && t.title.includes(`(${t.sc})`)),
  `${withSc.length} tools with shortcuts; without: ${tools
    .filter((t) => !t.sc)
    .map((t) => t.label)
    .join(", ")}`
);
// select a layer for the inspector
const bx = await p
  .locator('[data-invitation-canvas] [data-layer-id="names"]')
  .evaluate((e) => e.getBoundingClientRect().toJSON());
await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
await p.waitForTimeout(600);
const op = p.getByLabel("See-through", { exact: true });
check(
  "RD-J1a",
  "The See-through field keeps its name and now explains itself in a tooltip",
  (await op.count()) === 1 &&
    /Opacity/.test(await p.locator("label", { has: op }).getAttribute("title"))
);
// multi-select to show distribute controls
await p.keyboard.press("Control+a");
await p.waitForTimeout(600);
const text = await p.evaluate(() => document.body.innerText);
const names = await p.evaluate(() =>
  [...document.querySelectorAll("button")]
    .map((e) => (e.getAttribute("aria-label") || e.textContent || "").trim())
    .filter((t) => /space evenly|distribut/i.test(t))
);
check(
  "RD-J1b",
  "'Distribute' no longer appears; 'Space evenly' buttons are there",
  !/distribut/i.test(text + names.join(" ")) &&
    names.some((n) => /Space evenly, left to right/.test(n)) &&
    names.some((n) => /Space evenly, top to bottom/.test(n)),
  JSON.stringify([...new Set(names)])
);
await p.screenshot({
  path: "/tmp/tidy-j-after.png",
  clip: { x: 0, y: 100, width: 1440, height: 300 },
});
await b.close();
writeFileSync(
  process.argv[2] ?? "/tmp/batch45.json",
  JSON.stringify(results, null, 2)
);
