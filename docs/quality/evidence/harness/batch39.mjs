import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const URL = "http://localhost:3000/documentation/zz-fixture";
async function open(mode) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const p = await (
    await b.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();
  await p.goto(`${URL}?mode=${mode}`);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(900);
  return { b, p };
}
{
  const { b, p } = await open("pro");
  const box = await p
    .locator('[data-invitation-canvas] [data-layer-id="names"]')
    .evaluate((e) => e.getBoundingClientRect().toJSON());
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForTimeout(700);
  const r = await p.getByTestId("inspector-layer").evaluate((root) => {
    const grids = [...root.querySelectorAll("div")].filter(
      (e) => /grid-cols-2/.test(e.className) && e.querySelector("input")
    );
    const gaps = [
      ...new Set(
        grids.map(
          (g) =>
            getComputedStyle(g).columnGap + "/" + getComputedStyle(g).rowGap
        )
      ),
    ];
    const inputs = [...root.querySelectorAll("input[type=text]")].filter(
      (i) => i.getBoundingClientRect().width > 0
    );
    const radii = [
      ...new Set(
        inputs.map(
          (i) =>
            getComputedStyle(i.closest("label, span") || i).borderTopLeftRadius
        )
      ),
    ];
    const labels = [
      ...root.querySelectorAll("label.block > span.block:first-child"),
    ].map((s) => getComputedStyle(s).marginBottom);
    return { gaps, radii, labels: [...new Set(labels)], grids: grids.length };
  });
  check(
    "RD-D3",
    "Field grids use one gap and every field label one spacing",
    r.gaps.length === 1 && r.labels.length === 1,
    JSON.stringify(r)
  );
  const sec = await p
    .getByTestId("inspector-layer")
    .locator("section h2")
    .first()
    .evaluate((e) => getComputedStyle(e.firstElementChild).fontSize);
  const sub = await p
    .getByText("Position & size", { exact: true })
    .evaluate((e) => ({
      size: getComputedStyle(e).fontSize,
      caps: getComputedStyle(e).textTransform,
    }));
  check(
    "RD-D2",
    "The sub-heading is plain text, clearly different from the section heading",
    sub.caps === "none" && parseFloat(sub.size) > parseFloat(sec),
    JSON.stringify({ sec, sub })
  );
  const wide = await p.evaluate(() =>
    [
      ...document.querySelectorAll(
        "[data-testid=inspector-layer] input[type=text]"
      ),
    ]
      .filter((i) => i.getBoundingClientRect().width > 0)
      .map((i) => getComputedStyle(i).borderTopLeftRadius)
  );
  check(
    "RD-D4-pro",
    "Pro fields share the 10px control radius",
    wide.length > 0 && wide.every((x) => x === wide[0]),
    JSON.stringify([...new Set(wide)])
  );
  await p.screenshot({
    path: "/tmp/tidy-d-after-pro.png",
    clip: { x: 1000, y: 100, width: 440, height: 800 },
  });
  await b.close();
}
{
  const { b, p } = await open("simple");
  const all = await p.evaluate(() =>
    [...document.querySelectorAll(".desk-field")]
      .filter(
        (e) =>
          e.getBoundingClientRect().width > 0 &&
          !/rounded-full/.test(e.className)
      )
      .map((e) => ({
        t: e.tagName,
        c: e.className.slice(0, 80),
        r: getComputedStyle(e).borderTopLeftRadius,
      }))
  );
  console.log(JSON.stringify(all.filter((x) => x.r !== "10px")));
  const r = [...new Set(all.map((x) => x.r))];
  check(
    "RD-D4-simple",
    "Simple fields use the same 10px radius as Pro (pill-shaped search boxes excluded)",
    r.length === 1 && r[0] === "10px",
    JSON.stringify(r)
  );
  await p.screenshot({ path: "/tmp/tidy-d-after-simple.png" });
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch39.json",
  JSON.stringify(results, null, 2)
);
