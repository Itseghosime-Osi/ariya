import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const L = async (id) => (await layers(p)).find((l) => l.id === id);
const card = await p.locator("[data-invitation-canvas]").boundingBox();
const clickL = async (id) => {
  const c = centre(await L(id));
  await p.mouse.click(c.x, c.y);
};
const empty = () => p.mouse.click(card.x + 30, card.y + 450);
const snap = async () =>
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
const bar = p.getByLabel("Contextual Tool Options").first();

// DES-253 / DES-014 accessible names + tooltips for icon-only controls
const unnamed = await p.evaluate(() =>
  [...document.querySelectorAll('[data-testid="invitation-designer"] button')]
    .filter(
      (x) =>
        !(x.textContent || "").trim() &&
        !x.getAttribute("aria-label") &&
        !x.getAttribute("aria-labelledby")
    )
    .map((x) => x.getAttribute("title"))
);
const tools = await p.evaluate(() =>
  [...document.querySelectorAll('[data-testid="invitation-designer"] button')]
    .filter((x) => !(x.textContent || "").trim())
    .map((x) => !!x.getAttribute("title"))
);
check(
  "DES-253",
  "Use every icon-only button (names)",
  unnamed.length === 0,
  `icon-only buttons lacking aria-label: ${JSON.stringify(unnamed)}`
);
check(
  "DES-014",
  "Inspect tooltips",
  tools.every(Boolean),
  `${tools.filter(Boolean).length}/${tools.length} icon-only buttons carry a title tooltip (with shortcut where one exists)`
);
// DES-018 overlapping: draw rect over footer region then click
await p.keyboard.press("r");
const f = await L("footer");
await p.mouse.move(f.x + 20, f.y - 4);
await p.mouse.down();
await p.mouse.move(f.x + 160, f.y + 40, { steps: 6 });
await p.mouse.up();
await p.waitForTimeout(250);
const after = await layers(p);
const rect = after.find(
  (l) =>
    ![
      "seal",
      "kicker",
      "names",
      "message",
      "divider",
      "date",
      "venue",
      "dressCode",
      "footer",
    ].includes(l.id) && !l.id.startsWith("code-")
);
const rc = centre(rect);
const stack = await p.evaluate(
  ({ x, y }) => [
    ...new Set(
      document
        .elementsFromPoint(x, y)
        .map((el) =>
          el.closest("[data-layer-id]")?.getAttribute("data-layer-id")
        )
        .filter(Boolean)
    ),
  ],
  rc
);
await empty();
await p.mouse.click(rc.x, rc.y);
await p.waitForTimeout(150);
const topSel = await p.getByTestId("inspector-layer").first().innerText();
// pick the lower layer via Layers panel
const row = p
  .getByTestId("layers-dock")
  .locator('[aria-label^="Layer Kindly"]')
  .first();
await row.click({ position: { x: 100, y: 12 } });
await p.waitForTimeout(150);
const lowSel = await p.getByTestId("inspector-layer").first().innerText();
check(
  "DES-018",
  "Select overlapping objects",
  stack.length >= 2 && topSel !== lowSel,
  `stack at point=${JSON.stringify(stack)}; canvas click picks top layer; Layers row selects the one underneath`
);
// DES-024 hidden layer via Layers
const hideBtn = p.getByRole("button", { name: /^Hide Kindly reply/ });
await hideBtn.click();
await p.waitForTimeout(200);
const hiddenGone =
  !(await layers(p)).some((l) => l.id === "footer" && l.w > 0 && l.h > 0) ||
  (await p.evaluate(() => {
    const e = document.querySelector('[data-layer-id="footer"]');
    return (
      !e ||
      getComputedStyle(e).display === "none" ||
      getComputedStyle(e).visibility === "hidden" ||
      +getComputedStyle(e).opacity === 0
    );
  }));
await empty();
await p
  .getByTestId("layers-dock")
  .locator('[aria-label^="Layer Kindly"]')
  .first()
  .click({ position: { x: 100, y: 12 } });
await p.waitForTimeout(150);
const inspectorHidden = await p
  .getByTestId("inspector-layer")
  .first()
  .innerText();
check(
  "DES-024",
  "Select a hidden object in Layers",
  hiddenGone && /reply|Kindly/i.test(inspectorHidden),
  `hidden on canvas=${hiddenGone}; Layers row still selects it and opens its properties`
);
// restore: show it again
await p.getByRole("button", { name: /^Show Kindly reply/ }).click();
await p.waitForTimeout(150);
// DES-210 undo/redo every op: run a mixed sequence then undo all and redo all
await empty();
const s0 = await snap();
const ops = [];
await clickL("date");
await p.keyboard.press("Shift+ArrowRight");
await p.keyboard.press("Shift+ArrowRight");
ops.push("nudge");
await p
  .getByRole("button", { name: "Align left", exact: true })
  .first()
  .click();
ops.push("align");
await p.keyboard.press("Control+j");
ops.push("duplicate");
await p.keyboard.press("Delete");
ops.push("delete");
const sN = await snap();
let steps = 0;
while ((await snap()) !== s0 && steps < 12) {
  await undo();
  await p.waitForTimeout(80);
  steps++;
}
const sU = await snap();
const undoSteps = steps;
steps = 0;
while ((await snap()) !== sN && steps < 12) {
  await redo();
  await p.waitForTimeout(80);
  steps++;
}
const sR = await snap();
check(
  "DES-210",
  "Undo and redo each editing operation",
  sU === s0 && sR === sN,
  `ops ${ops.join("+")}: ${undoSteps} undos restore the original=${sU === s0}; ${steps} redos restore the final=${sR === sN}`
);
// DES-212 history restore
await p
  .getByRole("button", { name: /^History/ })
  .first()
  .click();
await p.waitForTimeout(250);
const hp = p.getByTestId("history-panel");
const entries = await hp.locator("button").allInnerTexts();
const labelled = entries.filter((t) =>
  /Moved|Original|Aligned|Added|Deleted|Changed|Resized/.test(t)
);
await hp.locator("button").first().click();
await p.waitForTimeout(250);
const restored =
  (await layers(p)).length === 10 &&
  !(await layers(p)).some((l) => l.id.startsWith("shape-"));
check(
  "DES-212",
  "Restore a history entry",
  labelled.length >= 3 && restored,
  `history labels: ${JSON.stringify(entries.slice(0, 14).map((t) => t.replace(/\s+/g, " ").trim()))}; clicking the first entry restores the original layout=${restored}`
);
const tooltipless = await p.evaluate(() =>
  [...document.querySelectorAll('[data-testid="invitation-designer"] button')]
    .filter((x) => !(x.textContent || "").trim() && !x.getAttribute("title"))
    .map((x) => x.getAttribute("aria-label"))
);
console.log("no-title icon buttons:", JSON.stringify(tooltipless));
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
await b.close();
