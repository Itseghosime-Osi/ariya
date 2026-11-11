import { open, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const sep = p.getByRole("separator", { name: "Resize Properties and Layers" });
const top = () => p.locator('[class*="panelTop"]').first().boundingBox();
const h0 = (await top()).height;
const sb = await sep.boundingBox();
await p.mouse.move(sb.x + sb.width / 2, sb.y + 3);
await p.mouse.down();
await p.mouse.move(sb.x + sb.width / 2, sb.y - 160, { steps: 6 });
await p.mouse.up();
const h1 = (await top()).height;
await sep.focus();
await p.keyboard.press("ArrowDown");
await p.keyboard.press("ArrowDown");
const h2 = (await top()).height;
await sep.dblclick();
const h3 = (await top()).height;
check(
  "UI-SPLIT",
  "Properties/Layers split is draggable, keyboard-operable and resets",
  h1 < h0 - 100 && h2 > h1 && Math.abs(h3 - h0) < 3,
  `heights ${h0.toFixed(0)} → drag ${h1.toFixed(0)} → arrows ${h2.toFixed(0)} → double-click ${h3.toFixed(0)}`
);
await p.screenshot({ path: process.argv[3] ?? "/tmp/split.png" });
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
await b.close();
const m = await open({ viewport: { width: 390, height: 844 } });
const hasSep = await m.p
  .getByRole("separator", { name: "Resize Properties and Layers" })
  .isVisible();
console.log("phone separator visible:", hasSep);
await m.b.close();
