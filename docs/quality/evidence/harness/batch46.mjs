import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
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
  await p.goto("http://localhost:3000/documentation/zz-fixture?mode=pro");
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const sz = (e) => {
      const b = e.getBoundingClientRect();
      return [Math.round(b.width), Math.round(b.height)];
    };
    const tools = [
      ...document.querySelectorAll(
        '[role="toolbar"][aria-label="Design tools"] > div > button'
      ),
    ]
      .filter((e) => e.getBoundingClientRect().width > 0)
      .map(sz);
    const tabs = [
      ...(document
        .querySelector('[aria-label="Studio panels"]')
        ?.querySelectorAll("button") ?? []),
    ]
      .filter((e) => e.getBoundingClientRect().width > 0)
      .map(sz);
    const stage = document
      .querySelector('[data-testid="designer-stage"]')
      .getBoundingClientRect();
    const bars = ["studio-statusbar"].map(
      (t) =>
        document.querySelector(`[data-testid="${t}"]`)?.getBoundingClientRect()
          .top
    );
    return {
      tools,
      tabs,
      stageBottom: Math.round(stage.bottom),
      statusTop: Math.round(bars[0]),
      over: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
  const min = (a) => Math.min(...a.flat());
  if (touch) {
    check(
      `RD-TT-${w}`,
      "Tool buttons and phone tabs are at least 44px on touch",
      r.tools.every(([x, y]) => x >= 44 && y >= 44) &&
        (r.tabs.length === 0 || r.tabs.every(([, y]) => y >= 44)),
      JSON.stringify({
        tools: [...new Set(r.tools.map((t) => t.join("x")))],
        tabs: [...new Set(r.tabs.map((t) => t.join("x")))],
      })
    );
  } else {
    check(
      `RD-TT-${w}`,
      "Desktop tool buttons keep 40px",
      r.tools.every(([x, y]) => x === 40 && y === 40),
      JSON.stringify([...new Set(r.tools.map((t) => t.join("x")))])
    );
  }
  check(
    `RD-TT-fit-${w}`,
    "Nothing overflows sideways and the canvas does not run under the bottom bar",
    !r.over && r.stageBottom <= r.statusTop + 1,
    JSON.stringify({ stageBottom: r.stageBottom, statusTop: r.statusTop })
  );
  await p.screenshot({ path: `/tmp/tidy-tt-${w}.png` });
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch46.json",
  JSON.stringify(results, null, 2)
);
