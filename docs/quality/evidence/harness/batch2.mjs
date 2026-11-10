import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const L = async (id) => (await layers(p)).find((l) => l.id === id);
const card = await p.locator("[data-invitation-canvas]").boundingBox();
const bar = p.getByLabel("Contextual Tool Options").first();
const btn = (t) => bar.getByRole("button", { name: t, exact: true });
const clickL = async (id, shift) => {
  const c = centre(await L(id));
  if (shift) await p.keyboard.down("Shift");
  await p.mouse.click(c.x, c.y);
  if (shift) await p.keyboard.up("Shift");
};
const empty = () => p.mouse.click(card.x + 30, card.y + 450);
const snapshot = async () =>
  JSON.stringify(
    (await layers(p)).map((l) => [
      l.id,
      Math.round(l.x),
      Math.round(l.y),
      Math.round(l.w),
      Math.round(l.h),
    ])
  );
const undo = () => p.keyboard.press("Control+z");
const redo = () => p.keyboard.press("Control+Shift+z");

// DES-013 disabled actions
const noSelDisabled = await btn("Align left").isDisabled();
await clickL("date");
const oneDistDisabled = await btn("Distribute horizontally").isDisabled();
check(
  "DES-013",
  "Use disabled actions",
  noSelDisabled && oneDistDisabled && !(await btn("Align left").isDisabled()),
  `align disabled with no selection=${noSelDisabled}; distribute disabled with one layer=${oneDistDisabled}; align enabled with one layer`
);
// DES-182 align to card
const res = {};
for (const [name, fn] of [
  ["Align left", (l) => l.x - card.x],
  ["Center horizontal", (l) => l.x + l.w / 2 - (card.x + card.width / 2)],
  ["Align right", (l) => l.x + l.w - (card.x + card.width)],
  ["Align top", (l) => l.y - card.y],
  ["Center vertical", (l) => l.y + l.h / 2 - (card.y + card.height / 2)],
  ["Align bottom", (l) => l.y + l.h - (card.y + card.height)],
]) {
  // use narrow layer so left/right differ from full width: the seal
  await empty();
  await clickL("seal");
  await btn(name).click();
  await p.waitForTimeout(150);
  res[name] = +fn(await L("seal")).toFixed(2);
  await undo();
  await p.waitForTimeout(100);
}
const alignOk =
  Math.abs(res["Align left"]) < 1.5 &&
  Math.abs(res["Center horizontal"]) < 1.5 &&
  Math.abs(res["Align right"]) < 1.5 &&
  Math.abs(res["Align top"]) < 1.5 &&
  Math.abs(res["Center vertical"]) < 1.5 &&
  Math.abs(res["Align bottom"]) < 1.5;
check(
  "DES-182",
  "Align left, centre, right, top, middle and bottom",
  alignOk,
  JSON.stringify(res) + " (px offset from card edge/centre; undo restores each)"
);
// DES-184 distribute
await empty();
const ids = ["kicker", "date", "dressCode"];
// move date off-centre first so gaps unequal
const before = await snapshot();
await clickL("kicker");
await clickL("date", true);
await clickL("dressCode", true);
const distEnabled = !(await btn("Distribute vertically").isDisabled());
await btn("Distribute vertically").click();
await p.waitForTimeout(200);
const k = await L("kicker"),
  dt = await L("date"),
  dc = await L("dressCode");
const gap1 = dt.y - (k.y + k.h),
  gap2 = dc.y - (dt.y + dt.h);
check(
  "DES-184",
  "Distribute horizontally or vertically (vertical)",
  distEnabled && Math.abs(gap1 - gap2) < 1.5,
  `gaps ${gap1.toFixed(1)} / ${gap2.toFixed(1)}`
);
await undo();
await p.waitForTimeout(150);
check(
  "DES-184b",
  "Distribute undo restores",
  (await snapshot()) === before,
  ""
);
await empty();
// DES-185 snap to canvas centre: drag names so centre is ~6 screen px off card centre, then check snapped
await clickL("names");
let nm = await L("names");
let c0 = centre(nm);
const targetX = card.x + card.width / 2 + 3;
await p.mouse.move(c0.x, c0.y);
await p.mouse.down();
await p.mouse.move(targetX, c0.y + 5, { steps: 10 });
const guideShown = await p.locator("[data-guide-id], [class*='guide']").count();
await p.mouse.up();
await p.waitForTimeout(150);
nm = await L("names");
const off = nm.x + nm.w / 2 - (card.x + card.width / 2);
check(
  "DES-185",
  "Snap to canvas centres and edges",
  Math.abs(off) < 0.6,
  `centre offset after drag to +3px: ${off.toFixed(2)}px`
);
await undo();
// DES-187 Alt disables snap
await clickL("names");
nm = await L("names");
c0 = centre(nm);
await p.mouse.move(c0.x, c0.y);
await p.mouse.down();
await p.keyboard.down("Alt");
await p.mouse.move(targetX, c0.y + 5, { steps: 10 });
await p.mouse.up();
await p.keyboard.up("Alt");
await p.waitForTimeout(150);
nm = await L("names");
const off2 = nm.x + nm.w / 2 - (card.x + card.width / 2);
check(
  "DES-187",
  "Temporarily disable snapping",
  Math.abs(off2) > 1.5 && Math.abs(off2 - 3) < 2,
  `with Alt: centre offset ${off2.toFixed(2)}px (free movement)`
);
await undo();
// DES-186 snap to other objects: drag venue so its left edge ~3px from names left edge
await empty();
await clickL("venue");
let vn = await L("venue");
let vc = centre(vn);
nm = await L("names");
const goalLeft = nm.x + 2.5;
await p.mouse.move(vc.x, vc.y);
await p.mouse.down();
await p.mouse.move(vc.x + (goalLeft - vn.x), vc.y, { steps: 10 });
await p.mouse.up();
await p.waitForTimeout(150);
vn = await L("venue");
const dEdge = Math.abs(vn.x - nm.x);
check(
  "DES-186",
  "Snap to other objects",
  dEdge < 0.6,
  `left edge offset to neighbour after dragging within 2.5px: ${dEdge.toFixed(2)}px`
);
await undo();
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
await b.close();
