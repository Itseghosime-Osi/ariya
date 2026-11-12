import pw from "/opt/node-tools/node_modules/playwright/index.js";
const { chromium } = pw;
const out = "../../docs/quality/screenshots";
for (const mode of ["simple", "pro"]) {
  for (const dark of [false, true]) {
    for (const [w, h, touch] of [
      [360, 740, true],
      [390, 844, true],
      [768, 1024, true],
      [1440, 900, false],
    ]) {
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
      await p.goto(
        `http://localhost:3000/documentation/zz-fixture?mode=${mode}`
      );
      await p
        .getByTestId("designer-stage")
        .locator("[data-invitation-canvas]")
        .waitFor();
      await p.waitForTimeout(900);
      if (dark) {
        await p
          .getByRole("button", { name: /Switch to the dark interface/ })
          .click();
        await p.waitForTimeout(700);
      }
      const bx = await p
        .locator('[data-invitation-canvas] [data-layer-id="names"]')
        .evaluate((e) => e.getBoundingClientRect().toJSON())
        .catch(() => null);
      if (bx && mode === "pro") {
        await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
        await p.waitForTimeout(500);
      }
      await p.screenshot({
        path: `${out}/tidy-final-${mode}-${dark ? "dark" : "light"}-${w}.png`,
      });
      await b.close();
    }
  }
}
