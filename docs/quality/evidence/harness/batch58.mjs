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
await p.waitForTimeout(1200);
await p.keyboard.press("?");
await p.waitForTimeout(600);
const clips = await p.locator('[data-testid^="help-clip-"]').count();
const open0 = await p.locator('[data-testid^="help-clip-"][open]').count();
await p.getByTestId("help-clip-move").locator("summary").click();
await p.waitForTimeout(1200);
const loaded = await p
  .getByTestId("help-clip-move")
  .locator("img")
  .evaluate((i) => i.complete && i.naturalWidth > 0);
check(
  "RD-D7",
  "Help lists five short clips, folded until opened, and an opened clip loads",
  clips === 5 && open0 === 0 && loaded,
  `clips=${clips} openAtStart=${open0} loaded=${loaded}`
);
await p.screenshot({
  path: "/home/user/ariya/docs/quality/screenshots/help-clips.png",
});
writeFileSync(
  process.argv[2] ?? "/tmp/batch58.json",
  JSON.stringify(results, null, 2)
);
await b.close();
