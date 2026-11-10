import { open, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const rows = () =>
  p
    .getByTestId("layers-dock")
    .locator('[role="group"][aria-label^="Layer "]')
    .evaluateAll((e) =>
      e.map((x) => x.getAttribute("aria-label").slice(6, 24))
    );
const order = () =>
  p.$$eval("[data-invitation-canvas] [data-layer-id]", (e) =>
    e.map((x) => x.getAttribute("data-layer-id"))
  );
const r0 = await rows(),
  o0 = await order();
const hs = p
  .getByTestId("layers-dock")
  .locator('[aria-label="Drag to reorder layer"]');
const h = await hs.nth(2).boundingBox();
const x = h.x + h.width / 2,
  y = h.y + h.height / 2;
await p.mouse.move(x, y);
await p.waitForTimeout(100);
await p.mouse.down();
await p.waitForTimeout(100);
for (let i = 1; i <= 20; i++) {
  await p.mouse.move(x, y + i * 5);
  await p.waitForTimeout(30);
}
await p.waitForTimeout(200);
await p.mouse.up();
await p.waitForTimeout(500);
const r1 = await rows(),
  o1 = await order();
check(
  "DES-170",
  "Reorder by dragging",
  JSON.stringify(r0) !== JSON.stringify(r1) &&
    JSON.stringify(o0) !== JSON.stringify(o1),
  `Layers: ${r0.slice(1, 4).join(" | ")} → ${r1.slice(1, 4).join(" | ")}; the card's stacking order changed to match`
);
await p.keyboard.press("Control+z");
await p.waitForTimeout(300);
check(
  "DES-170b",
  "Reorder undo",
  JSON.stringify(await rows()) === JSON.stringify(r0),
  "Undo restores the original order"
);
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
await b.close();
