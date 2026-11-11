import { open, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
await p.keyboard.press("Control+e");
await p.getByTestId("export-summary").waitFor();
await p.getByRole("button", { name: /Design Backup/ }).click();
const dl = p.waitForEvent("download", { timeout: 20000 });
await p.getByRole("button", { name: /^Download JSON/ }).click();
const d = await dl;
check(
  "RD-L7a",
  "Backup downloads",
  /\.json$/i.test(d.suggestedFilename()),
  d.suggestedFilename()
);
await p.waitForTimeout(500);
const t = p.getByRole("status").filter({ hasText: "Exported as" });
check(
  "RD-L7b",
  "Export shows a confirmation toast",
  (await t.count()) === 1,
  (await t.allInnerTexts()).join("|")
);
await p.screenshot({ path: "/tmp/exported.png" });
check(
  "RD-ERR",
  "No page errors",
  errs.length === 0,
  errs.join(";").slice(0, 200)
);
writeFileSync(
  process.argv[2] ?? "/tmp/batch22.json",
  JSON.stringify(results, null, 2)
);
await b.close();
