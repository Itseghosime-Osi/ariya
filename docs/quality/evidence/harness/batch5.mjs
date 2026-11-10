import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const card = await p.locator("[data-invitation-canvas]").boundingBox();
const undo = () => p.keyboard.press("Control+z");
const hb = async (n) => await p.locator(`[data-handle="${n}"]`).boundingBox();
const hc = async (n) => {
  const r = await hb(n);
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
};
const val = async (label) =>
  +(await p.getByLabel(label, { exact: true }).first().inputValue());
await p.keyboard.press("r");
await p.mouse.move(card.x + 120, card.y + 120);
await p.mouse.down();
await p.mouse.move(card.x + 320, card.y + 260, { steps: 6 });
await p.mouse.up();
await p.waitForTimeout(300);
console.log(
  "turn",
  await val("Turn"),
  "w",
  await val("Width"),
  "h",
  await val("Height")
);
// DES-039 rotate with handle: drag the rotate handle to the right of centre => ~90deg
const rot = await hc("rotate");
const nw = await hc("nw"),
  se = await hc("se");
const ctr = { x: (nw.x + se.x) / 2, y: (nw.y + se.y) / 2 };
const r0 = await val("Turn");
await p.mouse.move(rot.x, rot.y);
await p.mouse.down();
await p.mouse.move(ctr.x + 120, ctr.y, { steps: 8 });
await p.mouse.up();
await p.waitForTimeout(200);
const r1 = await val("Turn");
check(
  "DES-039",
  "Rotate with the rotation control",
  Math.abs(r1 - 90) <= 2,
  `handle dragged to the right of the centre: ${r0}° → ${r1}°`
);
// DES-041 snapping: drag to ~ 47 deg
await p.mouse.up();
const rot2 = await hc("rotate");
await p.mouse.move(rot2.x, rot2.y);
await p.mouse.down();
await p.mouse.move(
  ctr.x + 100 * Math.sin((47 * Math.PI) / 180),
  ctr.y - 100 * Math.cos((47 * Math.PI) / 180),
  { steps: 8 }
);
await p.mouse.up();
await p.waitForTimeout(200);
const r2 = await val("Turn");
check(
  "DES-041",
  "Snap rotation",
  r2 % 15 === 0 || Math.abs(r2 - 47) < 1.5,
  `dragging to ~47° gives ${r2}° (${r2 % 15 === 0 ? "snapped to a 15° step" : "free"})`
);
await undo();
await undo();
await p.waitForTimeout(150);
await p.getByLabel("Turn", { exact: true }).first().fill("0");
await p.getByLabel("Turn", { exact: true }).first().blur();
// DES-052 minimum dimensions: drag se handle past nw
const nw1 = await hc("nw");
let se1 = await hc("se");
await p.mouse.move(se1.x, se1.y);
await p.mouse.down();
await p.mouse.move(nw1.x - 80, nw1.y - 80, { steps: 10 });
await p.mouse.up();
await p.waitForTimeout(200);
const w = await val("Width"),
  h = await val("Height");
check(
  "DES-052",
  "Resize at minimum dimensions",
  w >= 0.5 && h >= 0.5 && Number.isFinite(w),
  `after dragging se handle past nw: width ${w}, height ${h} (document px; never zero/negative)`
);
await undo();
await p.waitForTimeout(150);
// DES-056 zoom compare: resize by 40 screen px at several zooms, expected doc px = 40/zoom
const zoomBtn = p.getByRole("button", { name: /reset zoom to fit/ });
const zoomOut = p.getByRole("button", { name: "Zoom out", exact: true }),
  zoomIn = p.getByRole("button", { name: "Zoom in", exact: true });
const out = [];
for (const target of ["fit", "in", "in2"]) {
  if (target === "in") await zoomIn.click();
  if (target === "in2") {
    await zoomIn.click();
  }
  await p.waitForTimeout(250);
  const zl = await zoomBtn.getAttribute("aria-label");
  const z = parseInt(zl) / 100;
  const sel = await p.locator('[data-handle="se"]').count();
  if (!sel) {
    out.push(`${zl}: handles missing`);
    continue;
  }
  const w0 = await val("Width");
  const se2 = await hc("se");
  await p.mouse.move(se2.x, se2.y);
  await p.mouse.down();
  await p.mouse.move(se2.x + 20, se2.y, { steps: 4 });
  await p.mouse.up();
  await p.waitForTimeout(150);
  const w1 = await val("Width");
  out.push({
    zoom: zl,
    grewDocPx: +(w1 - w0).toFixed(1),
    expected: +(20 / z).toFixed(1),
  });
  await undo();
  await p.waitForTimeout(100);
}
check(
  "DES-056",
  "Compare zoom levels",
  out.every(
    (o) =>
      typeof o === "object" &&
      Math.abs(o.grewDocPx - o.expected) < Math.max(3, o.expected * 0.12)
  ),
  JSON.stringify(out)
);
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
await b.close();
