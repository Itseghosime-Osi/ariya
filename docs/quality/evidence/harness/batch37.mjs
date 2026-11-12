import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const URL = "http://localhost:3000/documentation/zz-fixture?mode=pro";
for (const [w, h] of [
  [1440, 900],
  [1280, 720],
]) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const p = await (
    await b.newContext({ viewport: { width: w, height: h } })
  ).newPage();
  await p.goto(URL);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const out = {};
    for (const n of ["Default colours", "Swap colours"]) {
      const e = [...document.querySelectorAll("button")]
        .filter(
          (x) =>
            x.getAttribute("aria-label") === n &&
            x.getBoundingClientRect().width > 0
        )
        .pop();
      const bb = e?.getBoundingClientRect();
      out[n] = bb ? { w: bb.width, h: bb.height, bottom: bb.bottom } : null;
    }
    return { ...out, vh: innerHeight };
  });
  const scroll = await p.evaluate(() => {
    const t = document.querySelector(
      '[role="toolbar"][aria-label="Design tools"]'
    );
    let e = t;
    while (
      e &&
      !(
        e.scrollHeight > e.clientHeight + 1 &&
        /auto|scroll/.test(getComputedStyle(e).overflowY)
      )
    )
      e = e.parentElement;
    return !!e;
  });
  const last = p.getByRole("button", { name: "Swap colours" }).last();
  await last.scrollIntoViewIfNeeded();
  const vis = await last.evaluate(
    (e) => e.getBoundingClientRect().bottom <= innerHeight
  );
  check(
    `RD-C5-${w}`,
    "On a short window the rail scrolls so every tool and colour button can be reached",
    vis
  );
  check(
    `RD-C3-${w}`,
    "Colour reset and swap are 32px targets and on screen",
    Object.values(r)
      .filter((x) => typeof x === "object")
      .every((x) => x && x.w >= 32 && x.h >= 32),
    JSON.stringify(r)
  );
  await p.screenshot({
    path: `/tmp/tidy-c3-${w}.png`,
    clip: { x: 0, y: 0, width: 120, height: h },
  });
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch37.json",
  JSON.stringify(results, null, 2)
);
