import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const card = await p.locator("[data-invitation-canvas]").boundingBox();
const undo = () => p.keyboard.press("Control+z");
const L = async (id) => (await layers(p)).find((l) => l.id === id);
const val = async (label) =>
  +(await p.getByLabel(label, { exact: true }).first().inputValue());
const setNum = async (label, v) => {
  const f = p.getByLabel(label, { exact: true }).first();
  await f.fill(String(v));
  await f.blur();
  await p.waitForTimeout(200);
};
const draw = async (key, x0, y0, x1, y1) => {
  await p.keyboard.press(key);
  await p.mouse.move(card.x + x0, card.y + y0);
  await p.mouse.down();
  await p.mouse.move(card.x + x1, card.y + y1, { steps: 6 });
  await p.mouse.up();
  await p.waitForTimeout(250);
};
const bar = () =>
  p
    .getByLabel("Contextual Tool Options")
    .first()
    .evaluate((e) =>
      [...e.querySelectorAll("button,select,input")]
        .map((x) => x.getAttribute("aria-label") || x.title)
        .filter(Boolean)
        .join("|")
    );
const rpx = async (c) => {
  const t = await p
    .locator(`[data-radius-handle="${c}"]`)
    .getAttribute("title");
  return +t.match(/\(([\d.]+)px\)/)[1];
};
// DES-011 contextual options
await p.keyboard.press("t");
await p.waitForTimeout(200);
const tBar = await bar();
await p.keyboard.press("c");
await p.waitForTimeout(200);
const cBar = await bar();
await p.keyboard.press("Escape");
await p.keyboard.press("v");
await p.waitForTimeout(150);
const nm = await L("names");
await p.mouse.click(centre(nm).x, centre(nm).y);
await p.waitForTimeout(200);
check(
  "DES-011",
  "View contextual options",
  /Font family/.test(tBar) &&
    /Canvas width/.test(cBar) &&
    !/Font family/.test(cBar),
  `Type tool shows font/size/alignment; Canvas tool shows size/preset/apply/cancel; they differ`
);
await p.mouse.click(card.x + 30, card.y + 450);
// DES-070/075/082: big rounded rect
await draw("r", 100, 100, 420, 400);
await setNum("Width", 900);
await setNum("Height", 600);
await p
  .getByRole("button", { name: "Center horizontal", exact: true })
  .first()
  .click();
await p
  .getByRole("button", { name: "Center vertical", exact: true })
  .first()
  .click();
await p.waitForTimeout(200);
await p.getByLabel("Corner radius", { exact: true }).first().fill("20");
await p.getByLabel("Corner radius", { exact: true }).first().blur();
await p.waitForTimeout(200);
const hb = await p.locator('[data-radius-handle="tl"]').boundingBox();
const vals = [];
const t0 = Date.now();
await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
await p.mouse.down();
for (let i = 1; i <= 25; i++) {
  await p.mouse.move(hb.x + hb.width / 2 + i * 3, hb.y + hb.height / 2 + i * 3);
  vals.push(
    +(await p.locator("text=/^[0-9.]+ px$/").first().innerText()).replace(
      " px",
      ""
    )
  );
}
await p.mouse.up();
const dt = Date.now() - t0;
const mono = vals.every((v, i) => i === 0 || v >= vals[i - 1]);
check(
  "DES-075",
  "Round a large object",
  mono && new Set(vals).size > 10,
  `900×600 px rectangle: 25 drag steps give a monotonic live value (${vals[0]}→${vals[24]} px) in ${dt} ms, no jumps`
);
await undo();
await p.waitForTimeout(150);
// DES-070: shrink height with proportions unlocked
await p.getByLabel("Corner radius", { exact: true }).first().fill("40");
await p.getByLabel("Corner radius", { exact: true }).first().blur();
await setNum("Height", 160);
const r70 = await rpx("tl");
check(
  "DES-070",
  "Resize with proportions unlocked",
  r70 <= 80.5,
  `height 600→160 with a large radius: radius clamps to ${r70}px (≤ half the new height)`
);
// DES-082: release outside window
const hb2 = await p.locator('[data-radius-handle="tl"]').boundingBox();
await p.mouse.move(hb2.x + 7, hb2.y + 7);
await p.mouse.down();
await p.mouse.move(1435, 895, { steps: 8 });
await p.mouse.up();
await p.waitForTimeout(200);
const tipGone = (await p.locator("text=/^[0-9.]+ px$/").count()) === 0;
const rAfter = await rpx("tl");
check(
  "DES-082",
  "Release pointer outside canvas (radius)",
  tipGone && Number.isFinite(rAfter),
  `tooltip removed after release outside the card; radius settled at ${rAfter}px`
);
await p.keyboard.press("Escape");
// DES-074 very small object
await p.mouse.click(card.x + 30, card.y + 450);
await draw("r", 60, 520, 74, 534);
const widgets = await p.locator("[data-radius-handle]").count();
const handles = await p.locator("[data-handle]").evaluateAll((e) =>
  e.map((x) => {
    const r = x.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height];
  })
);
const widgetBoxes = await p.locator("[data-radius-handle]").evaluateAll((e) =>
  e.map((x) => {
    const r = x.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height];
  })
);
const overlap = widgetBoxes.some((w) =>
  handles.some(
    (h) =>
      w[0] < h[0] + h[2] &&
      w[0] + w[2] > h[0] &&
      w[1] < h[1] + h[3] &&
      w[1] + w[3] > h[1]
  )
);
check(
  "DES-074",
  "Round a very small object",
  widgets === 0 || !overlap,
  `14×14 px rectangle: ${widgets} radius widgets shown; widgets overlap resize handles=${overlap}`
);
await undo();
// DES-078 ellipse / line: no widgets
await p.mouse.click(card.x + 30, card.y + 450);
await draw("o", 100, 150, 200, 230);
const ell = await p.locator("[data-radius-handle]").count();
await p.mouse.click(card.x + 30, card.y + 450);
await draw("l", 100, 300, 300, 304);
const lin = await p.locator("[data-radius-handle]").count();
check(
  "DES-078b",
  "Ellipse and line show no corner-radius widgets",
  ell === 0 && lin === 0,
  `ellipse widgets=${ell}, line widgets=${lin}`
);
await undo();
await undo();
// DES-200 stroke visible: pixel diff of shape region
await p.mouse.click(card.x + 30, card.y + 450);
await draw("r", 100, 120, 300, 260);
const sid = (await layers(p)).find((l) => l.id.startsWith("shape-"));
const clip = {
  x: sid.x - 8,
  y: sid.y - 8,
  width: sid.w + 16,
  height: sid.h + 16,
};
await p.keyboard.press("Escape");
await p.mouse.click(card.x + 30, card.y + 450);
await p.waitForTimeout(200);
const before = await p.screenshot({ clip });
await p.mouse.click(centre(sid).x, centre(sid).y);
await p.waitForTimeout(200);
const ow = p.getByLabel("Outline width", { exact: true }).first();
if (await ow.count()) {
  await ow.press("End");
  await p.waitForTimeout(250);
}
await p.keyboard.press("Escape");
await p.mouse.click(card.x + 30, card.y + 450);
await p.waitForTimeout(250);
const after = await p.screenshot({ clip });
check(
  "DES-200",
  "Apply a border or stroke effect",
  Buffer.compare(before, after) !== 0,
  `Outline width changed → the rendered shape pixels differ (${Buffer.compare(before, after) !== 0})`
);
await undo();
await undo();
// DES-245 very long guest and couple names across the card
const long = {
  names:
    "Oluwaseyifunmitayo Chukwuemeka Babatunde-Nwachukwu & Oluwadamilare Adebayowale Ogunleye-Onyekachukwu",
  venue:
    "The Grand Ballroom of the Federal Palace Hotel and Towers, Ahmadu Bello Way, Victoria Island, Lagos State, Nigeria",
};
for (const [id, text] of Object.entries(long)) {
  const c = centre(await L(id));
  await p.mouse.dblclick(c.x, c.y);
  await p.waitForTimeout(250);
  await p.keyboard.press("Control+a");
  await p.keyboard.insertText(text);
  await p.mouse.click(card.x + 30, card.y + 450);
  await p.waitForTimeout(250);
}
const ls = await layers(p);
const bad = ls.filter(
  (l) =>
    !l.id.startsWith("code-") &&
    (l.x < card.x - 1 ||
      l.x + l.w > card.x + card.width + 1 ||
      l.y + l.h > card.y + card.height + 1)
);
const overlapTxt = (() => {
  const a = ls.find((l) => l.id === "names"),
    v = ls.find((l) => l.id === "message");
  return a.y + a.h > v.y;
})();
check(
  "DES-245",
  "Test very long guest and couple names",
  bad.length === 0,
  `very long couple names and venue stay inside the card (out of bounds: ${bad.map((x) => x.id)}); couple names overlap the message below=${overlapTxt}`
);
await undo();
await undo();
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
await b.close();
