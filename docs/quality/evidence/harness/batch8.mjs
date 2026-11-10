import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const card = await p.locator("[data-invitation-canvas]").boundingBox();
const L = async (id) => (await layers(p)).find((l) => l.id === id);
const undo = () => p.keyboard.press("Control+z");
const empty = () => p.mouse.click(card.x + 30, card.y + 450);
const bg = () =>
  p.evaluate(
    () =>
      getComputedStyle(document.querySelector("[data-invitation-canvas]"))
        .backgroundImage +
      "|" +
      getComputedStyle(document.querySelector("[data-invitation-canvas]"))
        .backgroundColor
  );
const cardPaint = () =>
  p.evaluate(() => {
    const c = document.querySelector("[data-invitation-canvas]");
    const s = getComputedStyle(c);
    return s.backgroundImage + "|" + s.backgroundColor;
  });
// DES-005 change background
const kinds = ["Velvet", "Colour", "Paper"];
const paints = [await cardPaint()];
for (const k of kinds) {
  await p.getByRole("radio", { name: k, exact: true }).click();
  await p.waitForTimeout(250);
  paints.push(await cardPaint());
}
const distinct = new Set(paints).size;
for (let i = 0; i < 3; i++) {
  await undo();
  await p.waitForTimeout(150);
}
const restored = (await cardPaint()) === paints[0];
check(
  "DES-005",
  "Change background",
  distinct >= 3 && restored,
  `${distinct} distinct card paints across Paper/Velvet/Colour; undo ×3 restores the original=${restored}`
);
// DES-151/152 swatches: rail's colour block
const sw = async () =>
  p.evaluate(() =>
    [
      document.querySelector('[title^="Active Fill colour"]'),
      document.querySelector('[title="Background / Secondary colour"]'),
    ].map((e) => e.style.background)
  );
const s0 = await sw();
await p.keyboard.press("x");
await p.waitForTimeout(200);
const s1 = await sw();
await p.keyboard.press("d");
await p.waitForTimeout(200);
const s2 = await sw();
check(
  "DES-152",
  "Swap and reset swatches",
  JSON.stringify(s0) !== JSON.stringify(s1) &&
    JSON.stringify(s2) !== JSON.stringify(s1),
  `X swaps (${s0.join(" / ")} → ${s1.join(" / ")}); D resets (${s2.join(" / ")})`
);
// DES-102 duplicate a shape
await p.keyboard.press("r");
await p.mouse.move(card.x + 100, card.y + 120);
await p.mouse.down();
await p.mouse.move(card.x + 240, card.y + 200, { steps: 5 });
await p.mouse.up();
await p.waitForTimeout(250);
const n0 = (await layers(p)).length;
await p.keyboard.press("Control+j");
await p.waitForTimeout(250);
const n1 = (await layers(p)).length;
const shapes = (await layers(p)).filter(
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
console.log(
  "shapes",
  JSON.stringify(shapes.map((x) => [Math.round(x.x), Math.round(x.y)]))
);
check(
  "DES-102",
  "Duplicate a shape",
  n1 === n0 + 1 &&
    shapes.length === 2 &&
    (Math.abs(shapes[0].x - shapes[1].x) > 1 ||
      Math.abs(shapes[0].y - shapes[1].y) > 1),
  `layers ${n0}→${n1}; the copy is offset from the original`
);
await undo();
await undo();
await p.waitForTimeout(150);
// DES-180 states in Layers
await empty();
const rowFor = (name) =>
  p.getByTestId("layers-dock").locator(`[aria-label^="Layer ${name}"]`).first();
await rowFor("Adaeze").click({ position: { x: 100, y: 12 } });
await p.waitForTimeout(150);
const selected = await rowFor("Adaeze").getAttribute("aria-current");
await p.getByRole("button", { name: /^Lock Adaeze/ }).click();
await p.waitForTimeout(150);
const lockLabel = await p
  .getByRole("button", { name: /^Unlock Adaeze/ })
  .count();
await p.getByRole("button", { name: /^Hide Adaeze/ }).click();
await p.waitForTimeout(150);
const showLabel = await p.getByRole("button", { name: /^Show Adaeze/ }).count();
const dimmed = await rowFor("Adaeze").evaluate(
  (e) => +getComputedStyle(e).opacity
);
check(
  "DES-180",
  "Identify selected, locked and hidden states",
  selected === "true" && lockLabel === 1 && showLabel === 1 && dimmed < 0.6,
  `selected row has aria-current=${selected}; lock → button becomes "Unlock"; hide → "Show" and row dims to ${dimmed}`
);
await undo();
await undo();
await p.waitForTimeout(150);
// DES-170 reordering is verified in batch9.mjs
// DES-258 shortcut collisions among tool titles
const titles = await p.evaluate(() =>
  [...document.querySelectorAll('[data-testid="invitation-designer"] [title]')]
    .map((e) => e.getAttribute("title"))
    .filter((t) => /\(([A-Za-z⇧]+)\)$/.test(t))
);
const keys = titles
  .map((t) => t.match(/\(([^)]+)\)$/)[1])
  .filter((k) => !/Cmd|Ctrl/.test(k));
const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
const pairs = Object.fromEntries(
  titles
    .filter((t) => /\(([A-Z⇧]+)\)$/.test(t))
    .map((t) => [t.match(/\(([^)]+)\)$/)[1], t.replace(/ \([^)]+\)$/, "")])
);
const uniq = [...new Set(dup)];
const cross = uniq.filter((k) => !["D", "X"].includes(k));
check(
  "DES-258",
  "Test tool shortcut collisions",
  cross.length === 0,
  `single-key shortcuts: ${JSON.stringify(pairs)}; keys shared by different tools: ${JSON.stringify(cross)} (D and X appear on two buttons that do the same thing)`
);
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
await b.close();
// DES-267 reduced motion
const rm = await open({ reducedMotion: "reduce" });
const longMotion = await rm.p.evaluate(() =>
  [...document.querySelectorAll('[data-testid="invitation-designer"] *')]
    .filter((e) => {
      const s = getComputedStyle(e);
      const d = parseFloat(s.transitionDuration),
        a = parseFloat(s.animationDuration);
      return (a > 0.05 && s.animationName !== "none") || d > 0.3;
    })
    .map((e) => e.tagName + "." + e.className.toString().slice(0, 30))
    .slice(0, 6)
);
console.log(
  "reduced-motion long animations/transitions:",
  JSON.stringify(longMotion)
);
await rm.b.close();
