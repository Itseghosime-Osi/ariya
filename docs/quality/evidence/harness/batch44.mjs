import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const out = [];
for (const [w, h, touch] of [
  [360, 740, true],
  [390, 844, true],
  [768, 1024, true],
  [1024, 768, false],
  [1440, 900, false],
]) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const p = await (
    await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch })
  ).newPage();
  await p.goto("http://localhost:3000/documentation/zz-fixture?mode=pro");
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const st = document.querySelector('header [role="status"]');
    const cs = getComputedStyle(st);
    const hd = document
      .querySelector('[data-testid="studio-top-header"]')
      .getBoundingClientRect();
    const menus = [...document.querySelectorAll("button")].filter(
      (e) =>
        e.textContent.trim() === "File" && e.getBoundingClientRect().width > 0
    )[0];
    const mrow = menus?.closest("[class*=Menus], div");
    const mb = menus?.getBoundingClientRect();
    return {
      size: cs.fontSize,
      weight: cs.fontWeight,
      color: cs.color,
      header: Math.round(hd.height),
      menuBtn: mb
        ? [
            Math.round(mb.height),
            cs.fontSize && getComputedStyle(menus).fontSize,
            getComputedStyle(menus).paddingLeft,
          ]
        : null,
    };
  });
  out.push({ w, ...r });
  console.log(w, JSON.stringify(r));
  await b.close();
}
const sizes = new Set(out.map((o) => `${o.size}/${o.weight}/${o.color}`));
results.push({
  id: "RD-B2",
  name: "Status line under the title has one size, weight and colour at every width",
  ok: sizes.size === 1,
  detail: [...sizes].join(" | "),
});
const mh = new Set(
  out.map((o) => o.menuBtn && o.menuBtn[1] + "/" + o.menuBtn[2])
);
results.push({
  id: "RD-B3",
  name: "Menu row buttons use one text size and padding at every width",
  ok: mh.size === 1,
  detail: [...mh].join(" | "),
});
for (const r of results)
  console.log(r.ok ? "PASS" : "FAIL", r.id, r.name, r.detail);
writeFileSync(
  process.argv[2] ?? "/tmp/batch44.json",
  JSON.stringify(results, null, 2)
);
