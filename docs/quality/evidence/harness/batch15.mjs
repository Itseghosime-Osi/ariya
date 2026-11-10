import { open, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open({ mode: "simple" });
const txt = (id) =>
  p.evaluate(
    (id) => document.querySelector(`[data-layer-id="${id}"]`)?.textContent,
    id
  );
const field = p
  .locator('[id="simple-venue"], [data-testid="simple-venue"], #simple-venue')
  .first();
const venue0 = await txt("venue");
await field.fill("The Pearl Garden, Lekki Phase 1");
await p.waitForTimeout(500);
const venue1 = await txt("venue");
await p.keyboard.press("Control+z");
await p.waitForTimeout(300);
const venue2 = await txt("venue");
check(
  "DES-249",
  "Edit event details (designer side)",
  venue1 === "The Pearl Garden, Lekki Phase 1" && venue0 !== venue1,
  `Simple-mode venue field updates the card live ("${venue0}" → "${venue1}"); undo gives "${venue2}". Whether guest-facing pages follow the change needs the authenticated suite and was not tested here`
);
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
await b.close();
