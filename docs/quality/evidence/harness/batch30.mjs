import { open, check, results } from "./lib.mjs";
import { writeFileSync, statSync } from "node:fs";
const { b, p, errs } = await open();
await p.keyboard.press("Control+e");
await p.getByTestId("export-summary").waitFor();
await p.getByRole("button", { name: /Small for WhatsApp/ }).click();
const sum = await p.getByTestId("export-summary").innerText();
check(
  "RD-B7a",
  "Summary describes the WhatsApp picture",
  /compressed to about 400 KB/.test(sum),
  sum
);
const dl = p.waitForEvent("download", { timeout: 90000 });
await p.getByRole("button", { name: /^Download WHATSAPP/ }).click();
const d = await dl;
await d.saveAs("/tmp/wa.jpg");
const size = statSync("/tmp/wa.jpg").size;
check(
  "RD-B7b",
  "File is named for WhatsApp and is a JPG",
  /-whatsapp\.jpg$/.test(d.suggestedFilename()),
  d.suggestedFilename()
);
check(
  "RD-B7c",
  "File is at most 400 KB",
  size <= 400 * 1024,
  `${Math.round(size / 1024)} KB`
);
const real = errs.filter((e) => !/Hydration failed/.test(e));
check(
  "RD-ERR",
  "No page errors",
  real.length === 0,
  real.join(";").slice(0, 200)
);
writeFileSync(
  process.argv[2] ?? "/tmp/batch30.json",
  JSON.stringify(results, null, 2)
);
await b.close();
