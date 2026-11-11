import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const card = await p.locator("[data-invitation-canvas]").boundingBox();
let confirmText = "";
p.on("dialog", async (d) => {
  confirmText = d.message();
  await d.accept();
});
const undo = () => p.keyboard.press("Control+z");
const L = async (id) => (await layers(p)).find((l) => l.id === id);
const draw = async (key, x0, y0, x1, y1) => {
  await p.keyboard.press(key);
  await p.mouse.move(card.x + x0, card.y + y0);
  await p.mouse.down();
  await p.mouse.move(card.x + x1, card.y + y1, { steps: 6 });
  await p.mouse.up();
  await p.waitForTimeout(250);
};
const menu = async (top, item) => {
  await p.getByRole("button", { name: top, exact: true }).click();
  await p.getByRole("menuitem", { name: item }).first().click();
  await p.waitForTimeout(250);
};
const order = () =>
  p.$$eval("[data-invitation-canvas] [data-layer-id]", (e) =>
    e.map((x) => x.getAttribute("data-layer-id"))
  );
// DES-171 bring forward / send backward one step
const o0 = await order();
const c = centre(await L("dressCode"));
await p.mouse.click(c.x, c.y);
await p.waitForTimeout(150);
await menu("Arrange", "Bring Forward");
const o1 = await order();
await menu("Arrange", "Send Backward");
const o2 = await order();
const i0 = o0.indexOf("dressCode"),
  i1 = o1.indexOf("dressCode");
check(
  "DES-171",
  "Bring forward, send backward, front and back (single step)",
  i1 === i0 + 1 && JSON.stringify(o2) === JSON.stringify(o0),
  `Arrange ▸ Bring Forward moves the layer up one place (${i0}→${i1}); Send Backward returns it exactly`
);
await p.mouse.click(card.x + 30, card.y + 450);
// DES-184 horizontal distribute of three rectangles
await draw("r", 30, 520, 80, 560);
await p.mouse.click(card.x + 30, card.y + 480);
await draw("r", 120, 520, 190, 560);
await p.mouse.click(card.x + 30, card.y + 480);
await draw("r", 380, 520, 420, 560);
await p.mouse.click(card.x + 30, card.y + 480);
const shapes = (await layers(p)).filter((l) => l.id.startsWith("shape-"));
await p.mouse.click(centre(shapes[0]).x, centre(shapes[0]).y);
await p.keyboard.down("Shift");
for (const s of shapes.slice(1)) await p.mouse.click(centre(s).x, centre(s).y);
await p.keyboard.up("Shift");
await p
  .getByRole("button", { name: "Distribute horizontally", exact: true })
  .first()
  .click();
await p.waitForTimeout(250);
const sh = (await layers(p))
  .filter((l) => l.id.startsWith("shape-"))
  .sort((a, b) => a.x - b.x);
const g1 = sh[1].x - (sh[0].x + sh[0].w),
  g2 = sh[2].x - (sh[1].x + sh[1].w);
check(
  "DES-184c",
  "Distribute horizontally",
  Math.abs(g1 - g2) < 1.5,
  `gaps ${g1.toFixed(1)} / ${g2.toFixed(1)} px between three rectangles of different widths`
);
for (let i = 0; i < 4; i++) {
  await undo();
  await p.waitForTimeout(80);
}
// DES-251 reset to template
const c2 = centre(await L("names"));
await p.mouse.dblclick(c2.x, c2.y);
await p.waitForTimeout(200);
await p.keyboard.press("Control+a");
await p.keyboard.insertText("Changed names");
await p.mouse.click(card.x + 30, card.y + 450);
await p.waitForTimeout(200);
await p.getByRole("button", { name: "File", exact: true }).click();
await p.getByRole("menuitem", { name: /Reset to Template/ }).click();
await p.waitForTimeout(400);
const dlg = confirmText ? 1 : 0;
await p.waitForTimeout(400);
const afterReset = await p.evaluate(
  () => document.querySelector('[data-layer-id="names"]')?.textContent
);
await undo();
await p.waitForTimeout(250);
const afterUndo = await p.evaluate(
  () => document.querySelector('[data-layer-id="names"]')?.textContent
);
check(
  "DES-251",
  "Apply a template (Reset to Template)",
  afterReset === "Adaeze & Tunde" && afterUndo === "Changed names",
  `confirmation asked (${dlg}): ${confirmText.slice(0, 40)}; reset restores the house words ("${afterReset}"); Undo brings back the edit ("${afterUndo}")`
);
await undo();
await p.waitForTimeout(150);
// DES-142/145 crop tool
await p.keyboard.press("c");
await p.waitForTimeout(250);
const overlayOn = await p.getByTestId("crop-overlay").count();
const w0 = await p.getByLabel("Canvas width", { exact: true }).inputValue();
await p.getByLabel("Canvas width", { exact: true }).fill("900");
await p.waitForTimeout(150);
await p.getByTitle("Cancel canvas resize (Esc)").click();
await p.waitForTimeout(250);
const cw = await p.locator("[data-invitation-canvas]").boundingBox();
const overlayOff = await p.getByTestId("crop-overlay").count();
check(
  "DES-145",
  "Distinguish image crop from canvas resize",
  overlayOn === 1 && overlayOff === 0 && Math.abs(cw.width - card.width) < 1,
  `the tool is labelled Canvas size & ratio; entering width 900 then Cancel (Esc) leaves the card at its original size; the overlay disappears with the tool (${overlayOn}→${overlayOff})`
);
// DES-265 stylus via CDP pen events
const cdp = await p.context().newCDPSession(p);
const n = await L("dressCode");
const nc = centre(n);
await p.keyboard.press("v");
await p.mouse.click(nc.x, nc.y);
const pen = (type, x, y, buttons) =>
  cdp.send("Input.dispatchMouseEvent", {
    type,
    x,
    y,
    button: "left",
    buttons,
    clickCount: 1,
    pointerType: "pen",
    force: 0.5,
  });
await pen("mouseMoved", nc.x, nc.y, 0);
await pen("mousePressed", nc.x, nc.y, 1);
for (let i = 1; i <= 8; i++) {
  await pen("mouseMoved", nc.x + i * 5, nc.y + i * 3, 1);
  await p.waitForTimeout(20);
}
await pen("mouseReleased", nc.x + 40, nc.y + 24, 0);
await p.waitForTimeout(250);
const n2 = await L("dressCode");
check(
  "DES-265",
  "Test stylus input (pen pointer events, emulated)",
  Math.abs(n2.x - n.x - 40) < 6 && Math.abs(n2.y - n.y - 24) < 6,
  `Chromium-emulated pen drag moved the layer ${(n2.x - n.x).toFixed(0)},${(n2.y - n.y).toFixed(0)} px of 40,24. Physical stylus and pressure were not tested`
);
await undo();
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
await b.close();
// DES-266 high-DPI and browser zoom (narrower viewport = larger text)
const res = [];
for (const [name, vp, dpr] of [
  ["dpr2", { width: 1440, height: 900 }, 2],
  ["dpr3-phone", { width: 390, height: 844 }, 3],
  ["zoom200", { width: 720, height: 450 }, 1],
  ["zoom300", { width: 480, height: 300 }, 1],
]) {
  const { chromium } =
    await import("/opt/node-tools/node_modules/playwright/index.mjs");
  const br = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const ctx = await br.newContext({ viewport: vp, deviceScaleFactor: dpr });
  const pg = await ctx.newPage();
  await pg.goto("http://localhost:3000/documentation/zz-fixture?mode=pro");
  await pg
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await pg.waitForTimeout(600);
  const m = await pg.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    exportVisible: (() => {
      const e = [...document.querySelectorAll("button")].find((b) =>
        /Export/.test(b.textContent)
      );
      if (!e) return false;
      const r = e.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.right <= window.innerWidth + 1 &&
        r.bottom <= window.innerHeight + 1
      );
    })(),
  }));
  res.push({ name, ...m });
  await br.close();
}
check(
  "DES-266",
  "Use browser zoom and high-DPI display",
  res.every((r) => !r.overflowX && r.exportVisible),
  JSON.stringify(res) +
    " - emulated by device scale factor and narrower viewports"
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
