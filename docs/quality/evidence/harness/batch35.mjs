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
  }
  await p.waitForTimeout(900);
  const scan = async (label) => {
    const r = await new Axe({ page: p })
      .withTags(["wcag2a", "wcag2aa"])
      .include('[data-testid="invitation-designer"]')
      .exclude("[data-invitation-canvas]")
      .exclude("nextjs-portal")
      .analyze();
    const bad = r.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact)
    );
    check(
      `RD-SWEEP-${label}-${tag}`,
      `axe: ${label} (${tag})`,
      bad.length === 0,
      bad
        .map((v) => `${v.id}(${v.nodes.length}):${v.nodes[0].target.join(" ")}`)
        .join(" ; ")
        .slice(0, 300)
    );
  };
  await scan("idle");
  const box = await p
    .locator('[data-invitation-canvas] [data-layer-id="names"]')
    .evaluate((e) => e.getBoundingClientRect().toJSON());
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForTimeout(600);
  await scan("selected");
  await p.keyboard.press("Control+z");
  await p.waitForTimeout(500);
  await scan("undo-toast");
  await p.screenshot({ path: `/tmp/sweep-toast-${tag}.png` });
  await p.keyboard.press("Control+a");
  await p.keyboard.press("Delete");
  await p.waitForTimeout(600);
  await scan("empty-card");
  await p.screenshot({ path: `/tmp/sweep-empty-${tag}.png` });
  await ctx.close();
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch35.json",
  JSON.stringify(results, null, 2)
);
