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
const URL = `${process.env.BASE ?? "http://localhost:3000"}/documentation/zz-fixture?mode=pro`;
async function open(extra = {}) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    ...extra,
  });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(900);
  return { b, p };
}
const layerCount = async (p) =>
  (await p.$$("[data-invitation-canvas] [data-layer-id]")).length;

// K6: 50 layers
{
  const { b, p } = await open();
  const names = p.locator('[data-invitation-canvas] [data-layer-id="names"]');
  const bx = await names.evaluate((e) => e.getBoundingClientRect().toJSON());
  await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press("Control+j");
    await p.waitForTimeout(40);
  }
  await p.waitForTimeout(800);
  const n = await layerCount(p);
  await p
    .getByRole("button", { name: /^Layers/ })
    .first()
    .click();
  await p.waitForTimeout(500);
  const dock = p.locator('[data-testid="layers-dock"]:visible').first();
  const info = await dock.evaluate((d) => {
    const rows = [
      ...d.querySelectorAll('button[aria-label="Drag to reorder layer"]'),
    ].map((g) => g.closest("[class*=min-h-]"));
    let sc = rows[0]?.parentElement;
    while (
      sc &&
      sc !== document.body &&
      !(
        /(auto|scroll)/.test(getComputedStyle(sc).overflowY) &&
        sc.scrollHeight > sc.clientHeight + 1
      )
    )
      sc = sc.parentElement;
    if (sc === document.body) sc = null;
    const hs = [
      ...new Set(
        rows
          .filter(Boolean)
          .map((r) => Math.round(r.getBoundingClientRect().height))
      ),
    ];
    return {
      rows: rows.length,
      heights: hs,
      scrolls: !!sc,
    };
  });
  check(
    "RD-K6-50",
    "50 layers: one row height and the list scrolls",
    n >= 50 && info.rows >= 50 && info.heights.length === 1 && info.scrolls,
    JSON.stringify({ layersOnCard: n, ...info })
  );
  const firstRow = dock
    .locator('button[aria-label="Drag to reorder layer"]')
    .first()
    .locator("xpath=ancestor::*[contains(@class,'min-h-')][1]");
  await firstRow.dblclick();
  const input = p.getByLabel("Layer name");
  const renamed = await input
    .waitFor({ timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (renamed) {
    await input.fill("Renamed layer");
    await p.keyboard.press("Enter");
    await p.waitForTimeout(300);
  }
  check(
    "RD-K6-rename",
    "Inline rename works with 50 layers",
    renamed && (await dock.getByText("Renamed layer").count()) >= 1
  );
  await p.screenshot({ path: "/tmp/layers-50.png" });
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch49.json",
  JSON.stringify(results, null, 2)
);
