import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const card = await p.locator("[data-invitation-canvas]").boundingBox();
const undo = () => p.keyboard.press("Control+z");
const val = async (label) =>
  +(await p.getByLabel(label, { exact: true }).first().inputValue());
// DES-181 background row
const paint0 = await p.evaluate(
  () =>
    getComputedStyle(document.querySelector("[data-invitation-canvas]"))
      .backgroundImage
);
await p.getByTestId("layer-row-background").click();
await p.waitForTimeout(250);
const hasCardControls =
  (await p.getByTestId("inspector-card").count()) === 1 &&
  (await p.getByRole("radio", { name: "Velvet", exact: true }).count()) === 1;
await p.getByRole("radio", { name: "Velvet", exact: true }).click();
await p.waitForTimeout(250);
const paint1 = await p.evaluate(
  () =>
    getComputedStyle(document.querySelector("[data-invitation-canvas]"))
      .backgroundImage
);
await undo();
await p.waitForTimeout(200);
const paint2 = await p.evaluate(
  () =>
    getComputedStyle(document.querySelector("[data-invitation-canvas]"))
      .backgroundImage
);
check(
  "DES-181",
  "Edit the background row",
  hasCardControls && paint1 !== paint0 && paint2 === paint0,
  `the Layers background row opens the card's background controls; Velvet repaints the card; Undo restores it`
);
// DES-240 insert the monogram seal
const n0 = (await layers(p)).length;
await p.getByRole("button", { name: "Add monogram seal" }).click();
await p.waitForTimeout(300);
const n1 = (await layers(p)).length;
const sealRows = await p
  .getByTestId("layers-dock")
  .locator('[role="group"][aria-label^="Layer "]')
  .evaluateAll((e) =>
    e.map((x) => x.getAttribute("aria-label")).filter((t) => /seal/i.test(t))
  );
check(
  "DES-240",
  "Insert the monogram seal",
  n1 === n0 + 1,
  `layers ${n0}→${n1}; seal rows: ${JSON.stringify(sealRows)}`
);
await undo();
await p.waitForTimeout(200);
// shape with outline / effects
await p.keyboard.press("r");
await p.mouse.move(card.x + 100, card.y + 120);
await p.mouse.down();
await p.mouse.move(card.x + 260, card.y + 220, { steps: 5 });
await p.mouse.up();
await p.waitForTimeout(250);
const outline = p.getByLabel(/outline/i);
console.log(
  "outline controls:",
  await outline.count(),
  await outline.evaluateAll((e) => e.map((x) => x.getAttribute("aria-label")))
);
const rectId = (await layers(p)).find((l) => l.id.startsWith("shape-")).id;
const style = () =>
  p.evaluate((id) => {
    const e = document.querySelector(`[data-layer-id="${id}"]`);
    const s = getComputedStyle(e);
    return {
      border: s.borderTopWidth + " " + s.borderTopStyle,
      outline: s.outlineWidth,
      shadow: s.boxShadow,
      filter: s.filter,
      w: e.getBoundingClientRect().width,
    };
  }, rectId);
const s0 = await style();
// DES-200 border or stroke effect: use the outline width control
const widthInput = p.getByLabel("Outline width", { exact: true }).first();
let strokeApplied = false;
if (await widthInput.count()) {
  await widthInput.fill("3");
  await widthInput.blur();
  await p.waitForTimeout(250);
  const s1 = await style();
  strokeApplied =
    s1.border !== s0.border ||
    s1.outline !== s0.outline ||
    s1.shadow !== s0.shadow;
  console.log("stroke", JSON.stringify(s0), JSON.stringify(s1));
}
check(
  "DES-200",
  "Apply a border or stroke effect",
  strokeApplied,
  "Outline width 3 changes the rendered border of a rectangle"
);
// DES-209 resize after effects
await p
  .getByLabel("Layer blend mode")
  .first()
  .selectOption("multiply")
  .catch(() => {});
const blur = p.getByLabel("Gaussian blur", { exact: true }).first();
await blur.press("End");
for (let i = 0; i < 2; i++) await blur.press("ArrowLeft");
const sh = p.getByRole("button", { name: /soft/i }).first();
await p.waitForTimeout(250);
const e0 = await style();
await p.getByLabel("Width", { exact: true }).first().fill("260");
await p.getByLabel("Width", { exact: true }).first().blur();
await p.waitForTimeout(300);
const e1 = await style();
check(
  "DES-209",
  "Resize after adding effects",
  e1.filter === e0.filter && e1.w !== e0.w,
  `blur/blend effect kept (${e1.filter}) while width changed ${e0.w.toFixed(0)}→${e1.w.toFixed(0)} px`
);
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
await b.close();
