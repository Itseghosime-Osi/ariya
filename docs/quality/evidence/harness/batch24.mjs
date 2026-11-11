import { open, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
// guides via the command palette
await p.mouse.click(700, 120);
await p.keyboard.press("Control+k");
await p.getByTestId("command-palette").waitFor();
await p.keyboard.type("print guides");
await p.keyboard.press("Enter");
await p.waitForTimeout(500);
const safe = p.getByTestId("print-guide-safe");
const bleed = p.getByTestId("print-guide-bleed");
check(
  "RD-B5a",
  "Safe-area and bleed guides appear",
  (await safe.count()) === 1 && (await bleed.count()) === 1
);
const cb = await p.locator("[data-invitation-canvas]").boundingBox();
const sb = await safe.boundingBox();
const bb = await bleed.boundingBox();
const insetS = (sb.x - cb.x) / cb.width;
const insetB = (cb.x - bb.x) / cb.width;
check(
  "RD-B5b",
  "Safe area is 5% (0.25 in of 5 in) inside, bleed 2.5% (0.125 in) outside",
  Math.abs(insetS - 0.05) < 0.005 && Math.abs(insetB - 0.025) < 0.005,
  `safe=${insetS.toFixed(3)} bleed=${insetB.toFixed(3)}`
);
check(
  "RD-B5c",
  "Guides are not inside the exported card element",
  (await p
    .locator('[data-invitation-canvas] [data-testid^="print-guide"]')
    .count()) === 0
);
await p.screenshot({ path: "/tmp/guides.png" });

// PDF with marks
await p.keyboard.press("Control+e");
await p.getByTestId("export-summary").waitFor();
check(
  "RD-B5d",
  "Print-marks option shown for PDF",
  (await p.getByTestId("export-print-marks").count()) === 1
);
await p.getByTestId("export-print-marks").check();
const sum = await p.getByTestId("export-summary").innerText();
check(
  "RD-B5e",
  "Summary describes the larger page",
  /bleed and crop marks/.test(sum),
  sum
);
await p.screenshot({ path: "/tmp/export-marks.png" });
const dl = p.waitForEvent("download", { timeout: 60000 });
await p.getByRole("button", { name: /^Download PDF/ }).click();
const d = await dl;
await d.saveAs("/tmp/marks.pdf");
check(
  "RD-B5f",
  "PDF downloads",
  /print\.pdf$/.test(d.suggestedFilename()),
  d.suggestedFilename()
);
check(
  "RD-ERR",
  "No page errors",
  errs.length === 0,
  errs.join(";").slice(0, 200)
);
writeFileSync(
  process.argv[2] ?? "/tmp/batch24.json",
  JSON.stringify(results, null, 2)
);
await b.close();
