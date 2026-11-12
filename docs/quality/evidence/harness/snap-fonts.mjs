import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const out = {};
for (const [mode, w, h, touch] of [
  ["pro", 1440, 900, false],
  ["pro", 390, 844, true],
  ["simple", 1440, 900, false],
  ["simple", 390, 844, true],
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
  await p.goto(`http://localhost:3000/documentation/zz-fixture?mode=${mode}`);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(900);
  if (mode === "pro") {
    const bx = await p
      .locator('[data-invitation-canvas] [data-layer-id="names"]')
      .evaluate((e) => e.getBoundingClientRect().toJSON());
    await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
    await p.waitForTimeout(600);
  }
  out[`${mode}-${w}`] = await p.evaluate(() => {
    const m = {};
    document
      .querySelectorAll('[data-testid="invitation-designer"] *')
      .forEach((e) => {
        if (
          e.closest("[data-invitation-canvas]") ||
          !e.getBoundingClientRect().width
        )
          return;
        const own = [...e.childNodes].some(
          (n) => n.nodeType === 3 && n.textContent.trim()
        );
        if (!own) return;
        const k = getComputedStyle(e).fontSize;
        m[k] = (m[k] || 0) + 1;
      });
    return m;
  });
  await b.close();
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
