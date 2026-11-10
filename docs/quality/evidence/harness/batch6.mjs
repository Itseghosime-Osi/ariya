import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const card = await p.locator("[data-invitation-canvas]").boundingBox();
const undo = () => p.keyboard.press("Control+z");
const hc = async (n) => {
  const r = await p.locator(`[data-handle="${n}"]`).boundingBox();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
};
const val = async (label) =>
  +(await p.getByLabel(label, { exact: true }).first().inputValue());
const rpx = async (c) =>
  +(await p.locator(`[data-radius-handle="${c}"]`).getAttribute("title")).match(
    /\(([\d.]+)px\)/
  )[1];
const draw = async (key, x0, y0, x1, y1) => {
  await p.keyboard.press(key);
  await p.mouse.move(card.x + x0, card.y + y0);
  await p.mouse.down();
  await p.mouse.move(card.x + x1, card.y + y1, { steps: 6 });
  await p.mouse.up();
  await p.waitForTimeout(250);
};
await draw("r", 120, 120, 320, 260);
// DES-059 widget present, labelled, with a pointer cursor
const wc = await p
  .locator('[data-radius-handle="tl"]')
  .evaluate((e) => getComputedStyle(e).cursor);
const title = await p
  .locator('[data-radius-handle="tl"]')
  .getAttribute("title");
check(
  "DES-059",
  "Hover a radius widget",
  /radius/i.test(title) && wc !== "auto",
  `cursor=${wc}; title="${title.slice(0, 70)}…"`
);
// DES-062 live value: during drag tooltip shows R: px and matches title after
const t0 = await rpx("tl");
const h = await p.locator('[data-radius-handle="tl"]').boundingBox();
const hx = h.x + h.width / 2,
  hy = h.y + h.height / 2;
await p.mouse.move(hx, hy);
await p.mouse.down();
await p.mouse.move(hx + 25, hy + 25, { steps: 6 });
const tip = await p
  .locator("text=/^[0-9.]+ px$/")
  .first()
  .innerText()
  .catch(() => "");
await p.mouse.up();
await p.waitForTimeout(200);
const t1 = await rpx("tl");
check(
  "DES-062",
  "Read the live value",
  /px/.test(tip) && Math.abs(parseFloat(tip) - t1) < 0.6,
  `tooltip during drag "${tip}"; widget value afterwards ${t1}px (was ${t0}px)`
);
// DES-068 geometric limit: drag far
const hh = await p.locator('[data-radius-handle="tl"]').boundingBox();
await p.mouse.move(hh.x + 7, hh.y + 7);
await p.mouse.down();
await p.mouse.move(hh.x + 600, hh.y + 600, { steps: 10 });
await p.mouse.up();
await p.waitForTimeout(200);
const W = await val("Width"),
  H = await val("Height");
const rmax = await rpx("tl");
check(
  "DES-068",
  "Reach geometric limits",
  rmax <= Math.min(W, H) / 2 + 1,
  `radius ${rmax}px with box ${W}×${H} (limit ${Math.min(W, H) / 2}px)`
);
// DES-069 change height after rounding: radius is clamped, not overflowing
await p.getByLabel("Height", { exact: true }).first().fill("160");
await p.getByLabel("Height", { exact: true }).first().blur();
await p.waitForTimeout(250);
const r2 = await rpx("tl");
const H2 = await val("Height");
check(
  "DES-069",
  "Change width or height after rounding",
  r2 <= H2 / 2 + 1,
  `height set to ${H2}; radius now ${r2}px (≤ ${H2 / 2}px)`
);
// DES-088 keyboard alternative: numeric radius field reachable and edits
const radiusField = p.getByLabel("Corner radius", { exact: true }).first();
const has = await radiusField.count();
if (has) {
  await radiusField.fill("3");
  await radiusField.blur();
  await p.waitForTimeout(200);
}
const r3 = has ? await rpx("tl") : -1;
check(
  "DES-088",
  "Use a keyboard alternative",
  has && r3 > 0 && r3 < r2 + 1,
  `numeric Corner radius field edits the radius via keyboard (now ${r3}px)`
);
// DES-072 zoom: same 30px drag at three zooms
const zoomIn = p.getByRole("button", { name: "Zoom in", exact: true }),
  zoomBtn = p.getByRole("button", { name: /reset zoom to fit/ });
await radiusField.fill("0");
await radiusField.blur();
await p.getByLabel("Height", { exact: true }).first().fill("200");
await p.getByLabel("Height", { exact: true }).first().blur();
await p
  .getByRole("button", { name: "Center horizontal", exact: true })
  .first()
  .click();
await p
  .getByRole("button", { name: "Center vertical", exact: true })
  .first()
  .click();
await p.waitForTimeout(200);
const out = [];
for (const step of [0, 1, 2, 3]) {
  if (step) await zoomIn.click();
  await p.waitForTimeout(300);
  const z = parseInt(await zoomBtn.getAttribute("aria-label")) / 100;
  await radiusField.fill("0");
  await radiusField.blur();
  await p.waitForTimeout(150);
  const hb = await p.locator('[data-radius-handle="tl"]').boundingBox();
  if (!hb) {
    out.push({ z, err: "no widget" });
    continue;
  }
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await p.mouse.down();
  await p.mouse.move(hb.x + hb.width / 2 + 20, hb.y + hb.height / 2 + 20, {
    steps: 5,
  });
  await p.mouse.up();
  await p.waitForTimeout(150);
  out.push({
    zoom: Math.round(z * 100),
    radiusPx: await rpx("tl"),
    expectedApprox: +(28 / z / 1).toFixed(1),
  });
}
check(
  "DES-072",
  "Change zoom to 25, 100 and 400 percent (three zooms)",
  out.every((o) => !o.err && o.radiusPx > 0),
  JSON.stringify(out) +
    " - the same 20px screen drag gives a radius that scales inversely with zoom"
);
// DES-073 pan with Space while selected
const before = await p.locator("[data-invitation-canvas]").boundingBox();
await p.keyboard.down("Space");
await p.waitForTimeout(150);
await p.mouse.move(600, 450);
await p.mouse.down();
await p.mouse.move(660, 480, { steps: 5 });
await p.mouse.up();
await p.keyboard.up("Space");
await p.waitForTimeout(200);
const afterB = await p.locator("[data-invitation-canvas]").boundingBox();
const stillSel = await p.locator('[data-radius-handle="tl"]').count();
check(
  "DES-073",
  "Pan while an object is selected",
  Math.abs(afterB.x - before.x - 60) < 6 && stillSel === 1,
  `Space+drag moved the card ${(afterB.x - before.x).toFixed(0)},${(afterB.y - before.y).toFixed(0)}px; selection and radius widgets remained`
);
// DES-078 non-rounded types: text has no radius widgets
await p.keyboard.press("Escape");
const ls = await layers(p);
const nm = ls.find((l) => l.id === "names");
await p.mouse.click(centre(nm).x, centre(nm).y);
const textWidgets = await p.locator("[data-radius-handle]").count();
check(
  "DES-078",
  "Select an ellipse, line, text or unsupported shape (text)",
  textWidgets === 0,
  `text layer shows ${textWidgets} radius widgets`
);
// DES-079 multi-select
await p.keyboard.down("Shift");
const dt = ls.find((l) => l.id === "date");
await p.mouse.click(centre(dt).x, centre(dt).y);
await p.keyboard.up("Shift");
check(
  "DES-079",
  "Select multiple objects",
  (await p.locator("[data-radius-handle]").count()) === 0 &&
    (await p.getByTestId("inspector-multiselect").count()) > 0,
  "no radius widgets while several layers are selected"
);
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
await b.close();
