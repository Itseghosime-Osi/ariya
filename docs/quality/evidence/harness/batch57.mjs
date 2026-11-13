import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const BASE = process.env.BASE ?? "http://localhost:3000";
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});
// 360x640 phone; an on-screen keyboard takes about 290px, leaving a 360x350 window.
const ctx = await b.newContext({
  viewport: { width: 360, height: 640 },
  hasTouch: true,
  isMobile: true,
});
const p = await ctx.newPage();
await p.goto(`${BASE}/documentation/zz-fixture?mode=simple`);
await p
  .getByTestId("designer-stage")
  .locator("[data-invitation-canvas]")
  .waitFor({ timeout: 90000 });
await p.waitForTimeout(1500);
// find the phone tab that holds the words
const tabs = await p.getByRole("button").allInnerTexts();
const wordsTab = p
  .getByRole("button", { name: /^(Edit|Words|Details|Properties)/ })
  .first();
if (await wordsTab.count()) await wordsTab.click().catch(() => {});
await p.waitForTimeout(500);
await p.setViewportSize({ width: 360, height: 350 });
await p.waitForTimeout(500);
const rows = [];
for (const label of ["Names", "Message", "Date", "Place"]) {
  const f = p
    .getByLabel(label === "Message" ? "Your message" : label, { exact: true })
    .first();
  if (!(await f.count())) {
    rows.push({ label, error: "field not found" });
    continue;
  }
  await f.focus();
  await p.waitForTimeout(300);
  const r = await f.evaluate((e) => {
    const b = e.getBoundingClientRect();
    const cx = b.x + b.width / 2,
      cy = b.y + b.height / 2;
    const top = document.elementFromPoint(
      cx,
      Math.min(Math.max(cy, 1), innerHeight - 1)
    );
    return {
      top: Math.round(b.top),
      bottom: Math.round(b.bottom),
      vh: innerHeight,
      covered: !(top === e || e.contains(top)),
      coveredBy:
        top && top !== e
          ? top.getAttribute("data-testid") || top.tagName
          : null,
    };
  });
  rows.push({
    label,
    ...r,
    visible: r.top >= 0 && r.bottom <= r.vh && !r.covered,
  });
}
check(
  "RD-L5",
  "With a 350px-tall window (keyboard open) on a 360px phone, each Simple field stays fully visible and uncovered when focused",
  rows.every((r) => r.visible),
  JSON.stringify(rows)
);
writeFileSync(
  process.argv[2] ?? "/tmp/batch57.json",
  JSON.stringify({ results, rows, tabs: tabs.slice(0, 30) }, null, 2)
);
await b.close();
