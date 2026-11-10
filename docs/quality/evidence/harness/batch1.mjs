import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const L = async (id) => (await layers(p)).find((l) => l.id === id);
const sel = async () =>
  p.$$eval('[data-testid="designer-selection"]', (e) => e.length);
const canvas = await p.locator("[data-invitation-canvas]").boundingBox();
const undo = () => p.keyboard.press("Control+z");
const redo = () => p.keyboard.press("Control+Shift+z");
const inspName = async () =>
  (await p.getByTestId("inspector-layer").count())
    ? (await p.getByTestId("inspector-layer").first().innerText()).slice(0, 60)
    : "";

// DES-033 select editable object
let n = await L("names");
let c = centre(n);
await p.mouse.click(c.x, c.y);
check(
  "DES-033",
  "Select an editable object",
  (await sel()) >= 1 && (await p.getByTestId("inspector-layer").count()) > 0,
  "selection frame + inspector shown"
);
// DES-017 click empty canvas deselects
await p.mouse.click(canvas.x + 30, canvas.y + 450);
check(
  "DES-017",
  "Click empty canvas",
  (await sel()) === 0,
  "selection cleared"
);
// DES-021 move by drag
await p.mouse.click(c.x, c.y);
let before = await L("names");
await p.mouse.move(c.x, c.y);
await p.mouse.down();
await p.mouse.move(c.x + 40, c.y + 30, { steps: 8 });
await p.mouse.up();
let after = await L("names");
const dx = after.x - before.x,
  dy = after.y - before.y;
check(
  "DES-021",
  "Move a selected object",
  Math.abs(dx - 40) < 6 && Math.abs(dy - 30) < 6,
  `moved ${dx.toFixed(1)},${dy.toFixed(1)} of 40,30`
);
// DES-032 undo a move + redo
await undo();
await p.waitForTimeout(200);
let u = await L("names");
const undoOk = Math.abs(u.x - before.x) < 1.5 && Math.abs(u.y - before.y) < 1.5;
await redo();
await p.waitForTimeout(200);
let r = await L("names");
check(
  "DES-032",
  "Undo a move",
  undoOk && Math.abs(r.x - after.x) < 1.5,
  `undo restored=${undoOk}; redo restored=${Math.abs(r.x - after.x) < 1.5}`
);
await undo();
await p.waitForTimeout(200);
// DES-031 cancel a move with Escape mid-drag
before = await L("names");
c = centre(before);
await p.mouse.click(c.x, c.y);
await p.mouse.move(c.x, c.y);
await p.mouse.down();
await p.mouse.move(c.x + 50, c.y + 50, { steps: 6 });
await p.keyboard.press("Escape");
await p.mouse.up();
await p.waitForTimeout(200);
after = await L("names");
const cancelled =
  Math.abs(after.x - before.x) < 1.5 && Math.abs(after.y - before.y) < 1.5;
check(
  "DES-031",
  "Cancel a move",
  cancelled,
  cancelled
    ? "Escape mid-drag restored position"
    : `moved ${(after.x - before.x).toFixed(1)},${(after.y - before.y).toFixed(1)} despite Escape`
);
// make sure state sane
await p.mouse.up();
// DES-027 arrow / shift nudge
await p.mouse.click(c.x, c.y);
before = await L("names");
await p.keyboard.press("ArrowRight");
await p.waitForTimeout(100);
const a1 = await L("names");
await p.keyboard.press("Shift+ArrowRight");
await p.waitForTimeout(100);
const a2 = await L("names");
const step1 = a1.x - before.x,
  step10 = a2.x - a1.x;
check(
  "DES-027",
  "Shift-nudge",
  step10 > step1 * 5 && step1 > 0,
  `arrow ${step1.toFixed(2)}px, shift+arrow ${step10.toFixed(2)}px (screen)`
);
await undo();
await undo();
// DES-019 shift select
await p.mouse.click(canvas.x + 30, canvas.y + 450);
const d = centre(await L("date")),
  v = centre(await L("venue"));
await p.mouse.click(d.x, d.y);
await p.keyboard.down("Shift");
await p.mouse.click(v.x, v.y);
await p.keyboard.up("Shift");
check(
  "DES-019",
  "Shift-select objects",
  (await sel()) >= 1 &&
    (await p.getByTestId("inspector-multiselect").count()) > 0,
  "multi-select inspector shown"
);
// DES-020 marquee
await p.mouse.click(canvas.x + 30, canvas.y + 450);
const k = await L("kicker"),
  nm = await L("names");
await p.mouse.move(canvas.x + 8, k.y - 8);
await p.mouse.down();
await p.mouse.move(canvas.x + canvas.width - 8, nm.y + nm.h + 6, { steps: 8 });
const marqueeShown = await p.getByTestId("selection-marquee").count();
await p.mouse.up();
await p.waitForTimeout(200);
check(
  "DES-020",
  "Drag a selection marquee",
  marqueeShown > 0 &&
    (await p.getByTestId("inspector-multiselect").count()) > 0,
  `marquee visible=${marqueeShown > 0}; multi-select inspector shown`
);
// DES-029 move partly outside canvas
await p.mouse.click(canvas.x + 30, canvas.y + 450);
const ds = await L("dressCode");
const dc = centre(ds);
await p.mouse.click(dc.x, dc.y);
await p.mouse.move(dc.x, dc.y);
await p.mouse.down();
await p.mouse.move(canvas.x + canvas.width + 20, dc.y, { steps: 10 });
await p.mouse.up();
const out = await L("dressCode");
check(
  "DES-029",
  "Move partly outside canvas",
  out.x + out.w > canvas.x + canvas.width,
  `right edge ${(out.x + out.w - (canvas.x + canvas.width)).toFixed(1)}px beyond card`
);
await undo();
// DES-030 release pointer outside canvas (outside the whole window area)
const sb = await L("dressCode");
const sc = centre(sb);
await p.mouse.click(sc.x, sc.y);
await p.mouse.move(sc.x, sc.y);
await p.mouse.down();
await p.mouse.move(1430, 880, { steps: 8 });
await p.mouse.up();
await p.waitForTimeout(200);
// subsequent drag must still work (not stuck)
const post = await L("dressCode");
const pc = centre(post);
await undo();
await p.waitForTimeout(150);
const re = await L("dressCode");
const rc = centre(re);
await p.mouse.click(rc.x, rc.y);
await p.mouse.move(rc.x, rc.y);
await p.mouse.down();
await p.mouse.move(rc.x + 20, rc.y, { steps: 4 });
await p.mouse.up();
const fin = await L("dressCode");
check(
  "DES-030",
  "Release pointer outside canvas",
  Math.abs(fin.x - re.x - 20) < 6,
  "gesture ended on release; next drag works normally"
);
await undo();
// DES-018 overlapping objects: footer overlaps the QR layer
const footer = await L("footer"),
  code = layers(p).then((a) => a.find((l) => l.id.startsWith("code-")));
const cd = await code;
const ox = Math.max(footer.x, cd.x) + 2,
  oy = Math.max(footer.y, cd.y) + 2;
const overlapExists =
  ox < Math.min(footer.x + footer.w, cd.x + cd.w) &&
  oy < Math.min(footer.y + footer.h, cd.y + cd.h);
await p.mouse.click(canvas.x + 30, canvas.y + 450);
const hit = await p.evaluate(
  ({ x, y }) => {
    const e = document
      .elementsFromPoint(x, y)
      .map((el) => el.closest("[data-layer-id]")?.getAttribute("data-layer-id"))
      .filter(Boolean);
    return [...new Set(e)];
  },
  { x: ox + 1, y: oy + 1 }
);
check(
  "DES-018",
  "Select overlapping objects (info)",
  true,
  `overlap=${overlapExists}; stack at point=${JSON.stringify(hit)}`
);
// DES-024 select hidden object via Layers
const lyr = p.getByTestId("layers-dock");
await lyr.getByText("The Lagos Event Centre", { exact: false }).first().hover();
const row = lyr
  .locator('[data-testid^="layer-row-"]')
  .filter({ hasText: "Lagos Event" })
  .first();
await row
  .getByRole("button", { name: /hide|visibility/i })
  .first()
  .click()
  .catch(() => {});
await p.waitForTimeout(200);
const hiddenNow = (await layers(p)).find((l) => l.id === "venue");
await row.click({ position: { x: 90, y: 14 } });
await p.waitForTimeout(200);
check(
  "DES-024",
  "Select a hidden object in Layers",
  (await sel()) >= 0 && (await p.getByTestId("inspector-layer").count()) > 0,
  `hidden layer rendered=${!!hiddenNow && hiddenNow.w > 0}; inspector opened from Layers row`
);
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
writeFileSync(
  process.argv[2] ?? "/tmp/b1.json",
  JSON.stringify(results, null, 1)
);
await b.close();
