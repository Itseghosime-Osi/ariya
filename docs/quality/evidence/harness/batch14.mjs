import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const L = async (id) => (await layers(p)).find((l) => l.id === id);
const card = await p.locator("[data-invitation-canvas]").boundingBox();
// DES-263 switch tabs / lose focus during a drag: gesture is cancelled and the layer restored
const n0 = await L("names");
const c = centre(n0);
await p.mouse.click(c.x, c.y);
await p.mouse.move(c.x, c.y);
await p.mouse.down();
await p.mouse.move(c.x + 60, c.y + 40, { steps: 6 });
await p.evaluate(() => window.dispatchEvent(new Event("blur")));
await p.waitForTimeout(200);
await p.mouse.up();
await p.waitForTimeout(200);
const n1 = await L("names");
// subsequent drag still works
const c1 = centre(n1);
await p.mouse.move(c1.x, c1.y);
await p.mouse.down();
await p.mouse.move(c1.x + 30, c1.y, { steps: 4 });
await p.mouse.up();
const n2 = await L("names");
check(
  "DES-263",
  "Switch tabs during a drag",
  Math.abs(n1.x - n0.x) < 1.5 && Math.abs(n2.x - n1.x - 30) < 5,
  `window blur mid-drag restored the layer (moved ${(n1.x - n0.x).toFixed(1)} px) and the next drag moved ${(n2.x - n1.x).toFixed(1)} of 30 px`
);
await p.keyboard.press("Control+z");
await p.waitForTimeout(150);
// DES-262 release Space outside the window: blur resets pan mode
await p.keyboard.down("Space");
await p.waitForTimeout(150);
await p.evaluate(() => window.dispatchEvent(new Event("blur")));
await p.waitForTimeout(200);
const n3 = await L("names"),
  c3 = centre(n3);
await p.mouse.click(c3.x, c3.y);
const before = await p.locator("[data-invitation-canvas]").boundingBox();
await p.mouse.move(c3.x, c3.y);
await p.mouse.down();
await p.mouse.move(c3.x + 40, c3.y + 20, { steps: 5 });
await p.mouse.up();
await p.waitForTimeout(150);
const after = await p.locator("[data-invitation-canvas]").boundingBox();
const n4 = await L("names");
await p.keyboard.up("Space");
check(
  "DES-262",
  "Release Space or a modifier outside the window",
  Math.abs(after.x - before.x) < 1 && Math.abs(n4.x - n3.x - 40) < 6,
  `after a blur while Space was held, dragging moves the layer (${(n4.x - n3.x).toFixed(0)} px) instead of panning the card (${(after.x - before.x).toFixed(0)} px)`
);
await p.keyboard.press("Control+z");
await p.waitForTimeout(150);
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
await b.close();
// DES-264 / DES-089 touch: phone viewport, touch events via CDP
const m = await open({ viewport: { width: 390, height: 844 }, touch: true });
const mp = m.p;
const cdp = await mp.context().newCDPSession(mp);
const tl = async (id) => (await layers(mp)).find((l) => l.id === id);
const touch = (type, x, y) =>
  cdp.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: type === "touchEnd" ? [] : [{ x, y }],
  });
const t0 = await tl("names"),
  tc = centre(t0);
await touch("touchStart", tc.x, tc.y);
await touch("touchEnd");
await mp.waitForTimeout(250);
const sel = await mp.getByTestId("designer-selection").count();
const y0 = await mp.evaluate(
  () =>
    window.scrollY +
    (document.querySelector('[data-testid="designer-stage"]')?.scrollTop ?? 0)
);
await touch("touchStart", tc.x, tc.y);
for (let i = 1; i <= 8; i++) {
  await touch("touchMove", tc.x + i * 4, tc.y + i * 3);
  await mp.waitForTimeout(20);
}
await touch("touchEnd");
await mp.waitForTimeout(250);
const t1 = await tl("names");
const y1 = await mp.evaluate(
  () =>
    window.scrollY +
    (document.querySelector('[data-testid="designer-stage"]')?.scrollTop ?? 0)
);
check(
  "DES-089a",
  "Touch drag moves a layer without scrolling the page",
  sel >= 1 && Math.abs(t1.x - t0.x - 32) < 8 && y1 === y0,
  `tap selected (${sel}); touch drag moved ${(t1.x - t0.x).toFixed(0)},${(t1.y - t0.y).toFixed(0)} of 32,24 px; page scroll changed by ${y1 - y0}`
);
// touch on a resize handle
const hs = await mp.locator('[data-handle="e"]').boundingBox();
const hx = hs.x + hs.width / 2,
  hy = hs.y + hs.height / 2;
const w0 = (await tl("names")).w;
await touch("touchStart", hx, hy);
for (let i = 1; i <= 6; i++) {
  await touch("touchMove", hx + i * 4, hy);
  await mp.waitForTimeout(20);
}
await touch("touchEnd");
await mp.waitForTimeout(250);
const w1 = (await tl("names")).w;
check(
  "DES-264",
  "Test touch scrolling near handles",
  Math.abs(w1 - w0) > 5,
  `touch drag on the east resize handle changed the box width ${w0.toFixed(0)}→${w1.toFixed(0)} px (Chromium touch emulation; physical devices not tested)`
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
await m.b.close();
