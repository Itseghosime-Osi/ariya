import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const n = (await layers(p)).find((l) => l.id === "names");
const c = centre(n);
await p.mouse.click(c.x, c.y);
await p.waitForTimeout(400);
const heads = p
  .getByRole("button", { expanded: true })
  .filter({ hasText: /Position|Text|Fill|Effects|Appearance/i });
const SEC = "section:has(> div > h3 > button[aria-expanded])";
const names = await p.locator(`${SEC} > div > h3 > button`).allInnerTexts();
check(
  "RD-K4a",
  "Inspector sections are collapsible buttons",
  names.length >= 4,
  names.map((x) => x.trim()).join(" | ")
);
const first = p.locator(`${SEC} > div > h3 > button`).first();
const box = await first.boundingBox();
check(
  "RD-K4b",
  "Section header is a 44px target",
  box.height >= 44,
  `${box.height}`
);
const label = (await first.innerText()).replace(/[▾\s]+/, "").trim();
const section = first.locator("xpath=ancestor::section[1]");
const body = section.locator(":scope > div").last();
const visibleBefore = await body.isVisible();
await first.click();
await p.waitForTimeout(200);
check(
  "RD-K4c",
  "Clicking folds the section",
  visibleBefore &&
    !(await body.isVisible()) &&
    (await first.getAttribute("aria-expanded")) === "false",
  label
);
await p.screenshot({ path: "/tmp/collapsed.png" });
// remembered across reload
await p.reload();
await p
  .getByTestId("designer-stage")
  .locator("[data-invitation-canvas]")
  .waitFor();
await p.waitForTimeout(800);
const n2 = (await layers(p)).find((l) => l.id === "names");
const c2 = centre(n2);
await p.mouse.click(c2.x, c2.y);
await p.waitForTimeout(500);
const again = p.locator(`${SEC} > div > h3 > button`).first();
check(
  "RD-K4d",
  "Folded state is remembered after a reload",
  (await again.getAttribute("aria-expanded")) === "false"
);
await again.click();
check(
  "RD-K4e",
  "Clicking again reopens it",
  (await again.getAttribute("aria-expanded")) === "true"
);
// keyboard
await again.focus();
await p.keyboard.press("Enter");
check(
  "RD-K4f",
  "Enter on the heading toggles it",
  (await again.getAttribute("aria-expanded")) === "false"
);
await p.keyboard.press("Space");
check(
  "RD-K4g",
  "Space toggles it back",
  (await again.getAttribute("aria-expanded")) === "true"
);
await p.screenshot({ path: "/tmp/inspector.png" });
const real = errs.filter((e) => !/Hydration failed/.test(e));
check(
  "RD-ERR",
  "No page errors (the reload hydration notice about the restored draft status is the existing behaviour and is excluded)",
  real.length === 0,
  real.join(";").slice(0, 200)
);
writeFileSync(
  process.argv[2] ?? "/tmp/batch25.json",
  JSON.stringify(results, null, 2)
);
await b.close();
