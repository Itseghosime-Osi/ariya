import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { mkdirSync } from "node:fs";
const { chromium } = pw;
const out = "/home/user/ariya/docs/quality/screenshots/m1";
mkdirSync(out, { recursive: true });
const SIDES = [
  ["before", "http://localhost:3200"],
  ["after", "http://localhost:3000"],
];
const STATES = [
  ["pro-selected", "pro"],
  ["simple", "simple"],
  ["export-dialog", "pro"],
];
const SIZES = [
  [360, 740, true],
  [768, 1024, true],
  [1440, 900, false],
];
for (const [side, base] of SIDES) {
  for (const [state, mode] of STATES) {
    for (const [w, h, touch] of SIZES) {
      for (const dark of [false, true]) {
        const b = await chromium.launch({
          executablePath: "/opt/pw-browsers/chromium",
        });
        const p = await (
          await b.newContext({
            viewport: { width: w, height: h },
            hasTouch: touch,
            isMobile: touch && w < 700,
          })
        ).newPage();
        await p.goto(`${base}/documentation/zz-fixture?mode=${mode}`);
        await p
          .getByTestId("designer-stage")
          .locator("[data-invitation-canvas]")
          .waitFor({ timeout: 90000 });
        await p.waitForTimeout(900);
        if (dark) {
          await p
            .getByRole("button", { name: /Switch to the dark interface/ })
            .click();
          await p.waitForTimeout(700);
        }
        if (state === "pro-selected") {
          const bx = await p
            .locator('[data-invitation-canvas] [data-layer-id="names"]')
            .evaluate((e) => e.getBoundingClientRect().toJSON());
          await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
          await p.waitForTimeout(500);
        }
        if (state === "export-dialog") {
          await p.getByRole("button", { name: "Export", exact: true }).click();
          await p.waitForTimeout(700);
        }
        await p.screenshot({
          path: `${out}/${side}-${state}-${w}-${dark ? "dark" : "light"}.png`,
        });
        await b.close();
      }
    }
  }
}
console.log("done");
