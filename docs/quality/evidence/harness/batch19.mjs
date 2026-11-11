import { open, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const dlg = () => p.getByTestId("studio-help");

// D6 / F1: help button + ? key
await p.getByRole("button", { name: "Help and shortcuts" }).click();
await dlg().waitFor();
const txt = await dlg().innerText();
check(
  "RD-D6",
  "Help button opens shortcut sheet",
  /Undo/.test(txt) &&
    /Export invitation/.test(txt) &&
    /help@ariyaday\.com/.test(txt)
);
await p.keyboard.press("Escape");
await p.waitForTimeout(300);
check("RD-D6b", "Escape closes help", (await dlg().count()) === 0);
await p.mouse.click(700, 500);
await p.keyboard.press("?");
await p.waitForTimeout(300);
check("RD-D6c", "? key opens help", (await dlg().count()) === 1);
await p.screenshot({ path: "/tmp/help.png" });
await p.keyboard.press("Escape");
await p.waitForTimeout(300);

// F1 size: button 40px at least? record
const bb = await p
  .getByRole("button", { name: "Help and shortcuts" })
  .boundingBox();
check(
  "RD-F1",
  "Help button size recorded",
  bb.width >= 44 && bb.height >= 44,
  `${bb.width}x${bb.height}`
);

// A2: offline status
const ctx = p.context();
await ctx.setOffline(true);
await p.evaluate(() => window.dispatchEvent(new Event("offline")));
await p.waitForTimeout(300);
const st = await p.locator('[role="status"]').first().innerText();
check("RD-A2", "Offline status shown", /offline/i.test(st), st);
await ctx.setOffline(false);
await p.evaluate(() => window.dispatchEvent(new Event("online")));
await p.waitForTimeout(300);
const st2 = await p.locator('[role="status"]').first().innerText();
check("RD-A2b", "Status recovers online", !/offline/i.test(st2), st2);

// L2: empty state: delete all layers
check(
  "RD-L2a",
  "No empty state with layers",
  (await p.getByTestId("studio-empty-state").count()) === 0
);
await p.keyboard.press("Control+a");
await p.keyboard.press("Delete");
await p.waitForTimeout(500);
check(
  "RD-L2b",
  "Empty state appears when card is empty",
  (await p.getByTestId("studio-empty-state").count()) === 1
);
await p.screenshot({ path: "/tmp/empty.png" });
await p
  .getByTestId("studio-empty-state")
  .getByRole("button", { name: "Add text" })
  .click();
await p.waitForTimeout(500);
check(
  "RD-L2c",
  "Add text removes empty state",
  (await p.getByTestId("studio-empty-state").count()) === 0
);
await p.keyboard.press("Control+z");
await p.keyboard.press("Control+z");

// B2: export summary
await p.keyboard.press("Control+e");
await p.getByTestId("export-summary").waitFor();
const s1 = await p.getByTestId("export-summary").innerText();
await p.getByRole("button", { name: /Compressed JPEG/ }).click();
const s2 = await p.getByTestId("export-summary").innerText();
check(
  "RD-B2",
  "Export summary follows format",
  /PDF/.test(s1) && /JPEG/.test(s2) && /px/.test(s2),
  `${s1} | ${s2}`
);
await p.screenshot({ path: "/tmp/export.png" });

check(
  "RD-ERR",
  "No page errors",
  errs.length === 0,
  errs.join(";").slice(0, 200)
);
writeFileSync(
  process.argv[2] ?? "/tmp/batch19.json",
  JSON.stringify(results, null, 2)
);
await b.close();
