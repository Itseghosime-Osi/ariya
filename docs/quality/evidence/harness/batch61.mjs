import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const BASE = process.env.BASE ?? "http://localhost:3000";
const b = await pw.chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});
const p = await (
  await b.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  })
).newPage();
await p.goto(`${BASE}/documentation/zz-fixture?mode=pro`);
await p
  .getByTestId("designer-stage")
  .locator("[data-invitation-canvas]")
  .waitFor({ timeout: 90000 });
await p.waitForTimeout(1500);
// 1: export notice has a check mark
await p.getByRole("button", { name: "Export", exact: true }).click();
await p.getByRole("button").filter({ hasText: "High-Resolution PNG" }).click();
const dl = p.waitForEvent("download", { timeout: 90000 });
await p.getByRole("button", { name: "Download PNG", exact: true }).click();
await dl;
await p.waitForTimeout(800);
const notice = p
  .getByRole("status")
  .filter({ hasText: /^Exported/ })
  .first();
const hasCheck = await notice.locator("svg").count();
check(
  "RD-K11c",
  "A finished export shows one small check beside the notice",
  (await notice.count()) === 1 && hasCheck >= 1,
  `svgs=${hasCheck}`
);
await p.screenshot({
  path: "/home/user/ariya/docs/quality/screenshots/k11-export-notice.png",
});
// 2: empty card shows the seal outline
await p.keyboard.press("Control+a");
await p.keyboard.press("Delete");
await p.waitForTimeout(800);
const empty = p.getByTestId("studio-empty-state");
const seal = await empty.locator("svg[aria-hidden='true']").count();
check(
  "RD-K11a",
  "An empty card shows a faint seal outline above the prompt",
  (await empty.count()) === 1 && seal === 1,
  `seal=${seal}`
);
await p.screenshot({
  path: "/home/user/ariya/docs/quality/screenshots/k11-empty-card.png",
});
// 3: gone once a layer exists
await empty.getByRole("button", { name: "Add text" }).click();
await p.waitForTimeout(600);
check(
  "RD-K11a2",
  "The seal outline is gone as soon as the card has a layer",
  (await p.getByTestId("studio-empty-state").count()) === 0
);
await b.close();
writeFileSync(
  process.argv[2] ?? "/tmp/batch61.json",
  JSON.stringify(results, null, 2)
);
