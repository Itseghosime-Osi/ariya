import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const BASE = process.env.BASE ?? "http://localhost:3000";
for (const [label, vp, touch] of [
  ["desktop", { width: 1440, height: 900 }, false],
  ["phone", { width: 390, height: 844 }, true],
]) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const p = await (
    await b.newContext({
      viewport: vp,
      hasTouch: touch,
      isMobile: touch,
      acceptDownloads: true,
    })
  ).newPage();
  await p.goto(`${BASE}/documentation/zz-fixture?mode=simple`);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(1200);
  const t0 = Date.now();
  let taps = 0;
  const fill = async (name, value) => {
    const f = p.getByLabel(name, { exact: true }).first();
    await f.scrollIntoViewIfNeeded();
    await f.fill(value);
    taps++;
  };
  await fill("Names", "Ọlá & Ṣeun");
  await fill("Date", "Saturday, 12 December 2026");
  await fill("Place", "Eko Hotel and Suites, Lagos");
  await p.getByRole("button", { name: "Export", exact: true }).click();
  taps++;
  await p
    .getByRole("button", { name: /Download/ })
    .first()
    .click({ trial: true });
  const dl = p.waitForEvent("download", { timeout: 90000 });
  await p
    .getByRole("button", { name: /Download/ })
    .first()
    .click();
  taps++;
  const d = await dl;
  const secs = (Date.now() - t0) / 1000;
  const shown = await p
    .locator("[data-invitation-canvas]")
    .first()
    .innerText()
    .catch(() => "");
  check(
    `RD-A1-${label}`,
    `Scripted run on ${label}: change names, date and place, export (no help opened)`,
    !!d && secs < 120,
    JSON.stringify({
      seconds: Math.round(secs * 10) / 10,
      steps: taps,
      file: d.suggestedFilename(),
      cardShowsNames: /Ọlá/.test(shown),
    })
  );
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch54.json",
  JSON.stringify(results, null, 2)
);
