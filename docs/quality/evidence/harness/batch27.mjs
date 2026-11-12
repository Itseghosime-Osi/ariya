import { open, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
for (const [name, vp, touch] of [
  ["desktop", { width: 1440, height: 900 }, false],
  ["phone", { width: 360, height: 740 }, true],
]) {
  const { b, p, errs } = await open({ viewport: vp, touch, mode: "pro" });
  const sel = p.getByTestId("zoom-presets");
  check(
    `RD-K7-${name}-a`,
    `Zoom presets are on screen (${name})`,
    (await sel.count()) === 1 && (await sel.isVisible())
  );
  const readPct = async () =>
    (
      await p.locator("button[aria-label$='reset zoom to fit']").innerText()
    ).trim();
  await sel.selectOption("1");
  await p.waitForTimeout(500);
  check(
    `RD-K7-${name}-b`,
    "100% preset sets 100%",
    (await readPct()) === "100%",
    await readPct()
  );
  await sel.selectOption("0.5");
  await p.waitForTimeout(400);
  check(
    `RD-K7-${name}-c`,
    "50% preset sets 50%",
    (await readPct()) === "50%",
    await readPct()
  );
  await sel.selectOption("4");
  await p.waitForTimeout(400);
  check(
    `RD-K7-${name}-d`,
    "400% preset sets 400%",
    (await readPct()) === "400%",
    await readPct()
  );
  await sel.selectOption("fit");
  await p.waitForTimeout(500);
  const fitPct = await readPct();
  check(
    `RD-K7-${name}-e`,
    "Fit returns to the fitted zoom",
    fitPct !== "400%" && parseInt(fitPct) < 100,
    fitPct
  );
  const box = await p.locator("button[aria-label='Zoom in']").boundingBox();
  const dock = await p
    .getByRole("button", { name: /^Export$|Export/ })
    .last()
    .boundingBox();
  check(
    `RD-K7-${name}-f`,
    "Dock still fits on screen",
    dock && dock.x + dock.width <= vp.width + 1 && dock.x >= 0,
    `export right edge=${dock && Math.round(dock.x + dock.width)} of ${vp.width}`
  );
  await p.screenshot({ path: `/tmp/zoom-${name}.png` });
  const real = errs.filter((e) => !/Hydration failed/.test(e));
  check(
    `RD-K7-${name}-err`,
    "No page errors",
    real.length === 0,
    real.join(";").slice(0, 200)
  );
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch27.json",
  JSON.stringify(results, null, 2)
);
