import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const b = await pw.chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});
const p = await (
  await b.newContext({ viewport: { width: 1440, height: 900 } })
).newPage();
await p.goto(
  `${process.env.BASE ?? "http://localhost:3000"}/documentation/zz-fixture?mode=pro`
);
await p
  .getByTestId("designer-stage")
  .locator("[data-invitation-canvas]")
  .waitFor({ timeout: 90000 });
await p.waitForTimeout(1500);
const layer = p.locator('[data-invitation-canvas] [data-layer-id="dressCode"]');
const bx = await layer.evaluate((e) => e.getBoundingClientRect().toJSON());
await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
await p.waitForTimeout(500);
// long words in the selected layer's text box
const words = p.getByLabel("Text", { exact: true }).first();
const area = (await words.count()) ? words : p.locator("textarea").first();
await area.fill(
  "Aso-ebi in emerald green and gold, with matching gele, agbada and fila for the gentlemen, and a touch of coral for the bridesmaids please"
);
await p.waitForTimeout(600);
const size = () =>
  layer.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
const sel = p.getByLabel("Text fit");
await p.getByTestId("inspector-more").count();
const base = await size();
await sel.selectOption("grow");
await p.waitForTimeout(500);
const grown = await size();
await sel.selectOption("shrink");
await p.waitForTimeout(500);
const shrunk = await size();
const lines = await layer.evaluate((e) =>
  Math.round(e.scrollHeight / parseFloat(getComputedStyle(e).lineHeight))
);
await sel.selectOption("auto");
await p.waitForTimeout(500);
const back = await size();
check(
  "RD-H2",
  "Grow keeps full size (box grows); Shrink makes long words smaller to fit; Card rule returns to the kind's own rule",
  grown >= base - 0.01 && shrunk < grown && Math.abs(back - base) < 0.01,
  JSON.stringify({ base, grown, shrunk, linesAfterShrink: lines, back })
);
writeFileSync(
  process.argv[2] ?? "/tmp/batch59.json",
  JSON.stringify(results, null, 2)
);
await b.close();
