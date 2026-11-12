import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const URL = "http://localhost:3000/documentation/zz-fixture?mode=pro";
for (const [w, h, touch] of [
  [1440, 900, false],
  [390, 844, true],
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
  await p.goto(URL);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(900);
  {
    const bx = await p
      .locator('[data-invitation-canvas] [data-layer-id="names"]')
      .evaluate((e) => e.getBoundingClientRect().toJSON());
    await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
    await p.waitForTimeout(500);
  }
  if (touch) {
    await p.getByRole("button", { name: "Layers", exact: true }).click();
    await p.waitForTimeout(500);
  }
  const dock = p.locator('[data-testid="layers-dock"]:visible').first();
  await dock.waitFor();
  const r = await dock.evaluate((d) => {
    const rows = [
      ...d.querySelectorAll('button[aria-label="Drag to reorder layer"]'),
    ].map((g) => g.closest("[class*=min-h-]"));
    const eye = [...d.querySelectorAll("button")].filter((b) =>
      /^(Hide|Show)/.test(b.getAttribute("aria-label") || b.title || "")
    );
    const grip = [
      ...d.querySelectorAll('button[aria-label="Drag to reorder layer"]'),
    ];
    const sz = (e) => {
      const r = e.getBoundingClientRect();
      return [Math.round(r.width), Math.round(r.height)];
    };
    return {
      rows: [...new Set(rows.filter(Boolean).map((e) => sz(e)[1]))],
      eye: [...new Set(eye.map((e) => sz(e).join("x")))],
      grip: [...new Set(grip.map((e) => sz(e).join("x")))],
      n: rows.length,
    };
  });
  const ok = touch
    ? r.rows.every((x) => x >= 44) &&
      r.eye.every((x) => +x.split("x")[0] >= 44 && +x.split("x")[1] >= 44) &&
      r.grip.every((x) => +x.split("x")[1] >= 44)
    : r.rows.length === 1;
  check(
    `RD-E1-${w}`,
    touch
      ? "Layer rows, grip, eye and lock are 44px on touch"
      : "Layer rows share one height on desktop",
    ok && r.n > 0,
    JSON.stringify(r)
  );
  const pads = await dock.evaluate((d) => {
    const strip = d
      .querySelector('select[aria-label="Layer blend mode"]')
      ?.closest(".border-b");
    const tabs = [...d.querySelectorAll("div")].find(
      (e) => /^All \(/.test(e.textContent || "") && e.children.length === 4
    );
    const c = (e) =>
      e
        ? [getComputedStyle(e).paddingLeft, getComputedStyle(e).paddingTop]
        : null;
    return { strip: c(strip), tabs: c(tabs) };
  });
  check(
    `RD-E2-${w}`,
    "Blend/opacity strip and the filter tabs share one padding",
    pads.strip && pads.tabs && pads.strip.join() === pads.tabs.join(),
    JSON.stringify(pads)
  );
  await dock.screenshot({ path: `/tmp/tidy-e-after-${w}.png` });
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch40.json",
  JSON.stringify(results, null, 2)
);
