import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const L = async (id) => (await layers(p)).find((l) => l.id === id);
const n0 = await L("names");
const c = centre(n0);

// L3: drag readout
await p.mouse.move(c.x, c.y);
await p.mouse.down();
await p.mouse.move(c.x + 40, c.y + 30, { steps: 6 });
const ro = p.getByTestId("drag-readout");
await ro.waitFor({ timeout: 2000 });
const txt = await ro.innerText();
check(
  "RD-L3a",
  "Readout shows live X/Y/W while dragging",
  /X \d+ · Y \d+ · W \d+ px/.test(txt),
  txt
);
await p.screenshot({ path: "/tmp/drag.png" });
await p.mouse.up();
await p.waitForTimeout(1300);
check("RD-L3b", "Readout disappears after the drag", (await ro.count()) === 0);

// L4: undo toast with Redo
const moved = await L("names");
await p.keyboard.press("Control+z");
await p.waitForTimeout(300);
const toast = p.getByRole("status").filter({ hasText: "Undone" });
check(
  "RD-L4a",
  "Undo shows an Undone toast with Redo",
  (await toast.count()) === 1 &&
    (await toast.getByRole("button", { name: "Redo" }).count()) === 1
);
const undone = await L("names");
check(
  "RD-L4b",
  "Undo moved the layer back",
  Math.abs(undone.x - n0.x) < 2 && Math.abs(undone.x - moved.x) > 10,
  `${n0.x} ${moved.x} ${undone.x}`
);
await p.screenshot({ path: "/tmp/undo.png" });
await toast.getByRole("button", { name: "Redo" }).click();
await p.waitForTimeout(300);
const redone = await L("names");
check(
  "RD-L4c",
  "Redo button reapplies the move",
  Math.abs(redone.x - moved.x) < 2,
  `${moved.x} ${redone.x}`
);
check(
  "RD-L4d",
  "Toast now says Redone with Undo",
  (await p
    .getByRole("status")
    .filter({ hasText: "Redone" })
    .getByRole("button", { name: "Undo" })
    .count()) === 1
);
await p.waitForTimeout(6500);
check(
  "RD-L4e",
  "Toast dismisses itself",
  (await p.getByRole("status").filter({ hasText: "Redone" }).count()) === 0
);
check(
  "RD-ERR",
  "No page errors",
  errs.length === 0,
  errs.join(";").slice(0, 200)
);
writeFileSync(
  process.argv[2] ?? "/tmp/batch20.json",
  JSON.stringify(results, null, 2)
);
await b.close();
