import pw from "/opt/node-tools/node_modules/playwright/index.js";
const { chromium } = pw;
const tag = process.argv[2];
const out = "../../docs/quality/screenshots";
for (const [w, h, touch, name] of [
  [1440, 900, false, "1440"],
  [1440, 720, false, "1440x720"],
  [390, 844, true, "390"],
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
  await p.goto("http://localhost:3000/documentation/zz-fixture?mode=pro");
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(900);
  await p.screenshot({
    path: `${out}/polish3-${tag}-${name}.png`,
    clip: touch
      ? { x: 0, y: 0, width: w, height: h }
      : { x: 0, y: 0, width: w, height: h },
  });
  await b.close();
}
