/**
 * The release re-check report for the invitation studio (checklist J3): `pnpm check:checklist`.
 * It lists what is open, what has not been re-evidenced for a while, and any broken evidence link,
 * so the person doing the re-check starts from the list instead of from memory.
 */
import {
  loadChecklist,
  missingFiles,
} from "../src/test/designer-checklist-parse";

const STALE_DAYS = Number(process.env.STALE_DAYS ?? 60);
const items = loadChecklist();
const today = Date.now();
const ageDays = (date: string | null) =>
  date ? Math.floor((today - Date.parse(date)) / 86_400_000) : null;

const open = items.filter((i) => !i.closed);
const stale = items.filter(
  (i) => i.closed && (ageDays(i.date) ?? Infinity) > STALE_DAYS
);
const broken = items.filter((i) => missingFiles(i).length > 0);

console.log(
  `${items.length - open.length} of ${items.length} closed, ${open.length} open\n`
);
console.log("Open:");
for (const i of open) console.log(`  ${i.id} (${i.priority}) ${i.title}`);
console.log(
  `\nClosed with no date, or older than ${STALE_DAYS} days (re-check these first):`
);
for (const i of stale)
  console.log(`  ${i.id} ${i.date ?? "undated"} ${i.title}`);
console.log("\nBroken evidence links:");
for (const i of broken) console.log(`  ${i.id}: ${missingFiles(i).join(", ")}`);
if (broken.length === 0) console.log("  none");
process.exitCode = broken.length ? 1 : 0;
