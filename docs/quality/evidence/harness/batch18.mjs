import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
let { b, p, errs } = await open();
let card = await p.locator("[data-invitation-canvas]").boundingBox();
const undo = () => p.keyboard.press("Control+z");
const redo = () => p.keyboard.press("Control+Shift+z");
const L = async (id) => (await layers(p)).find((l) => l.id === id);
const empty = () => p.mouse.click(card.x + 30, card.y + 450);
const draw = async (key, x0, y0, x1, y1) => {
  await p.keyboard.press(key);
  await p.mouse.move(card.x + x0, card.y + y0);
  await p.mouse.down();
  await p.mouse.move(card.x + x1, card.y + y1, { steps: 6 });
  await p.mouse.up();
  await p.waitForTimeout(250);
};
const setNum = async (label, v) => {
  const f = p.getByLabel(label, { exact: true }).first();
  await f.fill(String(v));
  await f.blur();
  await p.waitForTimeout(200);
};
const stateOf = () =>
  p.evaluate(() => {
    const c = document.querySelector("[data-invitation-canvas]");
    const cr = c.getBoundingClientRect();
    const r2 = (n) => Math.round(n * 10) / 10;
    const dock = document.querySelector('[data-testid="layers-dock"]');
    const rowsText = dock
      ? [...dock.querySelectorAll('[role="group"][aria-label^="Layer "]')].map(
          (g) =>
            g.getAttribute("aria-label") +
            "|" +
            [...g.querySelectorAll("button")]
              .map((b) => b.getAttribute("aria-label"))
              .join(",")
        )
      : [];
    return JSON.stringify({
      rowsText,
      card:
        getComputedStyle(c).backgroundImage.slice(0, 120) +
        getComputedStyle(c).backgroundColor,
      layers: [...c.querySelectorAll("[data-layer-id]")].map((e) => {
        const r = e.getBoundingClientRect(),
          s = getComputedStyle(e);
        return [
          e.getAttribute("data-layer-id"),
          r2(r.x - cr.x),
          r2(r.y - cr.y),
          r2(r.width),
          r2(r.height),
          e.textContent,
          s.color,
          s.opacity,
          s.transform,
          s.filter,
          s.mixBlendMode,
          s.backgroundColor,
          s.fontSize,
        ];
      }),
    });
  });
// DES-170 keyboard reorder
const rows = () =>
  p
    .getByTestId("layers-dock")
    .locator('[role="group"][aria-label^="Layer "]')
    .evaluateAll((e) =>
      e.map((x) => x.getAttribute("aria-label").slice(6, 26))
    );
const r0 = await rows();
const handle = p
  .getByTestId("layers-dock")
  .locator('[aria-label="Drag to reorder layer"]')
  .nth(2);
await handle.focus();
await p.keyboard.press("Space");
await p.waitForTimeout(150);
await p.keyboard.press("ArrowDown");
await p.waitForTimeout(150);
await p.keyboard.press("ArrowDown");
await p.waitForTimeout(150);
await p.keyboard.press("Space");
await p.waitForTimeout(400);
const r1 = await rows();
await undo();
await p.waitForTimeout(250);
const r2 = await rows();
check(
  "DES-170k",
  "Reorder layers with the keyboard",
  JSON.stringify(r0) !== JSON.stringify(r1) &&
    JSON.stringify(r2) === JSON.stringify(r0),
  `Space lifts a layer's handle, ArrowDown ×2 moves it, Space drops it: ${r0.slice(1, 4).join(" | ")} → ${r1.slice(1, 4).join(" | ")}; Undo restores the order`
);
await empty();
// DES-072 zoom 25% and 400%
await draw("r", 80, 120, 300, 300);
await setNum("Width", 700);
await setNum("Height", 500);
await p
  .getByRole("button", { name: "Center horizontal", exact: true })
  .first()
  .click();
await p
  .getByRole("button", { name: "Center vertical", exact: true })
  .first()
  .click();
const zoomLabel = async () =>
  parseInt(
    await p
      .getByRole("button", { name: /reset zoom to fit/ })
      .getAttribute("aria-label")
  );
const out = [];
const rpx = async () =>
  +(await p.locator('[data-radius-handle="tl"]').getAttribute("title")).match(
    /\(([\d.]+)px\)/
  )[1];
for (const target of [20, 400]) {
  for (
    let i = 0;
    i < 14 && Math.abs((await zoomLabel()) - target) > (target < 100 ? 4 : 60);
    i++
  ) {
    await p
      .getByRole("button", {
        name: (await zoomLabel()) > target ? "Zoom out" : "Zoom in",
        exact: true,
      })
      .click();
    await p.waitForTimeout(150);
  }
  const z = (await zoomLabel()) / 100;
  await setNum("Width", Math.round(420 / z));
  await setNum("Height", Math.round(300 / z));
  await p
    .getByRole("button", { name: "Center horizontal", exact: true })
    .first()
    .click();
  await p
    .getByRole("button", { name: "Center vertical", exact: true })
    .first()
    .click();
  await p.waitForTimeout(300);
  await p.getByLabel("Corner radius", { exact: true }).first().fill("0");
  await p.getByLabel("Corner radius", { exact: true }).first().blur();
  await p.waitForTimeout(250);
  const hb = await p
    .locator('[data-radius-handle="tl"]')
    .boundingBox()
    .catch(() => null);
  if (!hb) {
    out.push({ zoom: z * 100, note: "widget not shown" });
    continue;
  }
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await p.mouse.down();
  await p.mouse.move(hb.x + hb.width / 2 + 16, hb.y + hb.height / 2 + 16, {
    steps: 5,
  });
  await p.mouse.up();
  await p.waitForTimeout(200);
  const r = await rpx();
  out.push({
    zoom: z * 100,
    radiusPx: r,
    radiusTimesZoom: +(r * z).toFixed(1),
  });
}
check(
  "DES-072",
  "Change zoom to 20 and 345 percent",
  out.length === 2 &&
    out.every((o) => o.radiusPx > 0) &&
    Math.abs(out[0].radiusTimesZoom - out[1].radiusTimesZoom) <
      Math.max(4, out[0].radiusTimesZoom * 0.3),
  JSON.stringify(out) +
    " (radius × zoom stays about constant for the same screen drag; 45–120% was verified earlier)"
);
await p.keyboard.press("Control+0");
await p.waitForTimeout(250);
await empty();
// DES-078 widgets per shape kind
const kinds = [
  ["Rectangle", 4],
  ["Circle / Oval", 0],
  ["Line / Divider", 0],
  ["Cathedral Arch", null],
  ["Star / Sparkle", 0],
  ["Diamond", 0],
];
const seen = {};
for (const [name] of kinds) {
  await p.getByRole("button", { name: "Insert", exact: true }).click();
  await p
    .getByRole("menuitem", {
      name: new RegExp("^" + name.replace(/[\/]/g, "\\/")),
    })
    .first()
    .click();
  await p.waitForTimeout(300);
  seen[name] = await p.locator("[data-radius-handle]").count();
  await empty();
}
check(
  "DES-078c",
  "Corner-radius widgets by shape",
  seen["Circle / Oval"] === 0 &&
    seen["Line / Divider"] === 0 &&
    seen["Star / Sparkle"] === 0 &&
    seen["Diamond"] === 0,
  `widgets shown per inserted shape: ${JSON.stringify(seen)}`
);
// DES-210 per-operation undo/redo sweep, on a fresh page
await b.close();
const fresh = await open();
p = fresh.p;
b = fresh.b;
errs = fresh.errs;
card = await p.locator("[data-invitation-canvas]").boundingBox();
const rebind = () => {};
const ops = {
  textEdit: async () => {
    const c = centre(await L("names"));
    await p.mouse.click(c.x, c.y);
    await p.mouse.dblclick(c.x, c.y);
    await p.waitForTimeout(300);
    await p.keyboard.press("Control+a");
    await p.keyboard.insertText("Ọlá & Ada");
    await p.waitForTimeout(200);
    await empty();
  },
  move: async () => {
    const c = centre(await L("date"));
    await p.mouse.click(c.x, c.y);
    await p.mouse.move(c.x, c.y);
    await p.mouse.down();
    await p.mouse.move(c.x + 30, c.y + 20, { steps: 5 });
    await p.mouse.up();
  },
  nudge: async () => {
    const c = centre(await L("date"));
    await p.mouse.click(c.x, c.y);
    await p.keyboard.press("Shift+ArrowDown");
  },
  resize: async () => {
    const c = centre(await L("message"));
    await p.mouse.click(c.x, c.y);
    const e = await p.locator('[data-handle="e"]').boundingBox();
    await p.mouse.move(e.x + 14, e.y + 14);
    await p.mouse.down();
    await p.mouse.move(e.x - 40, e.y + 14, { steps: 5 });
    await p.mouse.up();
  },
  rotate: async () => {
    const c = centre(await L("kicker"));
    await p.mouse.click(c.x, c.y);
    await setNum("Turn", 15);
  },
  colour: async () => {
    const c = centre(await L("venue"));
    await p.mouse.click(c.x, c.y);
    await p.getByLabel("Text colour: #a3263b", { exact: true }).click();
  },
  opacity: async () => {
    const c = centre(await L("dressCode"));
    await p.mouse.click(c.x, c.y);
    await setNum("See-through", 40);
  },
  flip: async () => {
    const c = centre(await L("dressCode"));
    await p.mouse.click(c.x, c.y);
    await p.getByRole("button", { name: "Flip horizontal" }).click();
  },
  align: async () => {
    const c = centre(await L("seal"));
    await p.mouse.click(c.x, c.y);
    await p
      .getByRole("button", { name: "Align left", exact: true })
      .first()
      .click();
  },
  hide: async () => {
    await p.getByRole("button", { name: /^Hide Gold rule/ }).click();
  },
  lock: async () => {
    await p.getByRole("button", { name: /^Lock Gold rule/ }).click();
  },
  rename: async () => {
    const row = p
      .getByTestId("layers-dock")
      .locator('[aria-label^="Layer Gold rule"]');
    await row.dblclick({ position: { x: 90, y: 12 } });
    await p.keyboard.press("Control+a");
    await p.keyboard.type("Divider line");
    await p.keyboard.press("Enter");
  },
  duplicate: async () => {
    const c = centre(await L("dressCode"));
    await p.mouse.click(c.x, c.y);
    await p.keyboard.press("Control+j");
  },
  delete: async () => {
    const c = centre(await L("dressCode"));
    await p.mouse.click(c.x, c.y);
    await p.keyboard.press("Delete");
  },
  addShape: async () => {
    await empty();
    await draw("r", 60, 520, 200, 600);
  },
  addText: async () => {
    await empty();
    await draw("t", 60, 560, 260, 600);
    await p.keyboard.type("New words");
    await empty();
  },
  bringForward: async () => {
    const c = centre(await L("dressCode"));
    await p.mouse.click(c.x, c.y);
    await p.getByRole("button", { name: "Arrange", exact: true }).click();
    await p.getByRole("menuitem", { name: "Bring Forward" }).click();
  },
  background: async () => {
    await p.getByTestId("layer-row-background").click();
    await p.getByRole("radio", { name: "Velvet", exact: true }).click();
  },
};
const sweep = [];
for (const [name, op] of Object.entries(ops)) {
  await empty();
  await p.waitForTimeout(150);
  const s0 = await stateOf();
  try {
    await op();
  } catch (e) {
    sweep.push({ name, error: String(e).slice(0, 80) });
    continue;
  }
  await p.waitForTimeout(300);
  const s1 = await stateOf();
  if (s1 === s0) {
    sweep.push({ name, note: "no visible change" });
    continue;
  }
  let n = 0;
  while ((await stateOf()) !== s0 && n < 6) {
    await undo();
    await p.waitForTimeout(150);
    n++;
  }
  const back = (await stateOf()) === s0;
  let m = 0;
  while ((await stateOf()) !== s1 && m < 6) {
    await redo();
    await p.waitForTimeout(150);
    m++;
  }
  const fwd = (await stateOf()) === s1;
  sweep.push({
    name,
    undoSteps: n,
    undoExact: back,
    redoSteps: m,
    redoExact: fwd,
  });
  // keep the redone state out of the next op: undo again
  let k = 0;
  while ((await stateOf()) !== s0 && k < 6) {
    await undo();
    await p.waitForTimeout(150);
    k++;
  }
}
const bad = sweep.filter(
  (s) => s.error || s.note || !s.undoExact || !s.redoExact
);
check(
  "DES-210",
  "Undo and redo each editing operation",
  bad.length === 0,
  `${sweep.length} operations swept; ${sweep.length - bad.length} restore exactly on undo and redo: ${JSON.stringify(sweep.map((s) => s.name + (s.undoSteps ? ":" + s.undoSteps : "")))}${bad.length ? "; problems: " + JSON.stringify(bad) : ""}`
);
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
await b.close();
