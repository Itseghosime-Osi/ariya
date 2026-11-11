import { open, layers, centre, check, results } from "./lib.mjs";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync } from "node:fs";
const Axe = AxeBuilder.default ?? AxeBuilder;
async function scan(p, label, id) {
  const r = await new Axe({ page: p })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .exclude("nextjs-portal")
    .exclude("#docs-search")
    .analyze();
  const bad = r.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact)
  );
  check(
    id,
    `axe: no serious or critical issues — ${label}`,
    bad.length === 0,
    bad
      .map((v) => `${v.id}(${v.nodes.length}): ${v.nodes[0].target.join(" ")}`)
      .slice(0, 5)
      .join(" ; ")
  );
  return r;
}
for (const dark of [false, true]) {
  const th = dark ? "dark" : "light";
  const { b, p, errs } = await open({ mode: "pro" });
  if (dark) {
    await p
      .getByRole("button", { name: /Switch to the dark interface/ })
      .click();
    await p.waitForTimeout(1200);
  }
  await scan(p, `${th}, idle`, `RD-K10-${th}-idle`);
  const n = (await layers(p)).find((l) => l.id === "names");
  await p.mouse.click(centre(n).x, centre(n).y);
  await p.waitForTimeout(700);
  await scan(p, `${th}, layer selected`, `RD-K10-${th}-selected`);
  await p.keyboard.press("?");
  await p.getByTestId("studio-help").waitFor();
  await scan(p, `${th}, help dialog`, `RD-K10-${th}-help`);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);
  await p.keyboard.press("Control+e");
  await p.getByTestId("export-summary").waitFor();
  await scan(p, `${th}, export dialog`, `RD-K10-${th}-export`);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);
  await p.keyboard.press("Control+k");
  await p.getByTestId("command-palette").waitFor();
  await scan(p, `${th}, command palette`, `RD-K10-${th}-palette`);
  await b.close();
}
const { b: b2, p: p2 } = await open({ mode: "simple" });
await scan(p2, "light, Simple mode", "RD-K10-simple");
await b2.close();
writeFileSync(
  process.argv[2] ?? "/tmp/batch29.json",
  JSON.stringify(results, null, 2)
);
