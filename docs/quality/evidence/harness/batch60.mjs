import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const b = await pw.chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});
const p = await (
  await b.newContext({ viewport: { width: 1440, height: 900 } })
).newPage();
await p.goto(
  `${process.env.BASE ?? "http://localhost:3000"}/documentation/zz-fixture?mode=pro`
);
await p
  .getByTestId("designer-stage")
  .locator("[data-invitation-canvas]")
  .waitFor({ timeout: 90000 });
await p.waitForTimeout(1500);
const L = (id) => p.locator(`[data-invitation-canvas] [data-layer-id="${id}"]`);
const pick = async (id) => {
  const bx = await L(id).evaluate((e) => e.getBoundingClientRect().toJSON());
  await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
  await p.waitForTimeout(450);
};
const size = (id) =>
  L(id).evaluate(
    (e) => Math.round(parseFloat(getComputedStyle(e).fontSize) * 100) / 100
  );
const openStyle = async () => {
  const s = p.getByTestId("brand-style");
  if (!(await s.isVisible().catch(() => false))) {
    await p
      .getByRole("button", { name: /Brand style/ })
      .first()
      .click();
    await p.waitForTimeout(250);
  }
};
await pick("date");
await openStyle();
await p.getByLabel("Name this look as a style").fill("Detail");
await p.getByRole("button", { name: "Save style" }).click();
await p.waitForTimeout(400);
for (const id of ["venue", "dressCode"]) {
  await pick(id);
  await openStyle();
  await p.getByLabel("Follows style").selectOption({ label: "Detail" });
  await p.waitForTimeout(400);
}
const s0 = {
  date: await size("date"),
  venue: await size("venue"),
  dressCode: await size("dressCode"),
};
await pick("date");
await openStyle();
const sizeInput = p.getByLabel("Size (px)", { exact: true }).first();
await sizeInput.fill("30");
await sizeInput.blur();
await p.waitForTimeout(500);
const dateBig = await size("date");
await p.getByRole("button", { name: "Update style from this line" }).click();
await p.waitForTimeout(600);
const s1 = {
  date: await size("date"),
  venue: await size("venue"),
  dressCode: await size("dressCode"),
};
const notice = await p
  .getByText(/lines follow this style/)
  .first()
  .innerText()
  .catch(() => "");
await p.keyboard.press("Control+z");
await p.waitForTimeout(600);
const s2 = {
  date: await size("date"),
  venue: await size("venue"),
  dressCode: await size("dressCode"),
};
check(
  "RD-A3a",
  "Updating one style changes every layer that follows it",
  s1.venue === s1.date &&
    s1.dressCode === s1.date &&
    s1.date === dateBig &&
    s1.venue !== s0.venue,
  JSON.stringify({ s0, dateBig, s1, notice })
);
check(
  "RD-A3b",
  "One Undo reverses the whole style update",
  s2.venue === s0.venue && s2.dressCode === s0.dressCode,
  JSON.stringify({ s2 })
);
// stack
await pick("venue");
await p.keyboard.down("Shift");
await pick("dressCode");
await pick("footer");
await p.keyboard.up("Shift");
const ys = () =>
  Promise.all(
    ["venue", "dressCode", "footer"].map((id) =>
      L(id).evaluate((e) => Math.round(e.getBoundingClientRect().top))
    )
  );
const before = await ys();
await p.locator("button[type=submit]", { hasText: /^Stack$/ }).click();
await p.waitForTimeout(600);
const after = await ys();
const gaps = await Promise.all(
  ["venue", "dressCode", "footer"].map((id) =>
    L(id).evaluate((e) => e.getBoundingClientRect().toJSON())
  )
);
const sorted = gaps.sort((a, c) => a.top - c.top);
const g1 = Math.round(sorted[1].top - sorted[0].bottom),
  g2 = Math.round(sorted[2].top - sorted[1].bottom);
check(
  "RD-A3c",
  "Stack lays three lines out with the same gap",
  Math.abs(g1 - g2) <= 2,
  JSON.stringify({ before, after, gaps: [g1, g2] })
);
writeFileSync(
  process.argv[2] ?? "/tmp/batch60.json",
  JSON.stringify(results, null, 2)
);
await b.close();
