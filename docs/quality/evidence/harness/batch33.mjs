import pw from "/opt/node-tools/node_modules/playwright/index.js";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const Axe = AxeBuilder.default ?? AxeBuilder;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const URL = "http://localhost:3000/documentation/zz-fixture?mode=pro";
for (const [os, studioDark] of [
  ["dark", false],
  ["dark", true],
  ["light", true],
]) {
  const tag = `os-${os}-studio-${studioDark ? "dark" : "light"}`;
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: os,
  });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(800);
  if (studioDark) {
    await p
      .getByRole("button", { name: /Switch to the dark interface/ })
      .click();
    await p.waitForTimeout(900);
  }
  const scan = async (label, selector) => {
    const r = await new Axe({ page: p })
      .withTags(["wcag2a", "wcag2aa"])
      .include(selector)
      .analyze();
    const bad = r.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact)
    );
    check(
      `RD-DLG-${label}-${tag}`,
      `axe: ${label} has no serious or critical issues (${tag})`,
      bad.length === 0,
      bad
        .map((v) => `${v.id}:${v.nodes[0].target.join(" ")}`)
        .join(" ; ")
        .slice(0, 300)
    );
  };
  // Help dialog
  await p.mouse.click(700, 120);
  await p.keyboard.press("?");
  await p.getByTestId("studio-help").waitFor();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `/tmp/dlg-help-${tag}.png` });
  await scan("help", '[data-testid="studio-help"]');
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);
  // Command palette
  await p.mouse.click(700, 120);
  await p.keyboard.press("Control+k");
  await p.getByTestId("command-palette").waitFor();
  await p.keyboard.type("exp");
  await p.waitForTimeout(300);
  await p.screenshot({ path: `/tmp/dlg-palette-${tag}.png` });
  await scan("palette", '[data-testid="command-palette"]');
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);
  // Quick tour
  await p.mouse.click(700, 120);
  await p.keyboard.press("Control+k");
  await p.getByTestId("command-palette").waitFor();
  await p.keyboard.type("quick tour");
  await p.keyboard.press("Enter");
  await p.getByTestId("quick-tour").waitFor();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `/tmp/dlg-tour-${tag}.png` });
  await scan("tour", '[data-testid="quick-tour"]');
  await ctx.close();
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch33.json",
  JSON.stringify(results, null, 2)
);
