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
const BASE = `${process.env.BASE ?? "http://localhost:3000"}/documentation/zz-fixture`;
for (const mode of ["pro", "simple"]) {
  for (const [os, studioDark] of [
    ["light", false],
    ["light", true],
  ]) {
    const tag = `${mode}-os-${os}-studio-${studioDark ? "dark" : "light"}`;
    const b = await chromium.launch({
      executablePath: "/opt/pw-browsers/chromium",
    });
    const p = await (
      await b.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: os,
      })
    ).newPage();
    await p.goto(`${BASE}?mode=${mode}`);
    await p
      .getByTestId("designer-stage")
      .locator("[data-invitation-canvas]")
      .waitFor();
    await p.waitForTimeout(800);
    if (studioDark) {
      await p
        .getByRole("button", { name: /Switch to the dark interface/ })
        .click();
      await p.waitForTimeout(800);
    }
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
        `RD-K10-${label}-${tag}`,
        `axe: ${label} (${tag})`,
        bad.length === 0,
        bad
          .map(
            (v) =>
              `${v.id}(${v.nodes.length}):${v.nodes[0].target.join(" ").slice(0, 80)}`
          )
          .join(" ; ")
          .slice(0, 300)
      );
    };
    if (mode === "simple") {
      await scan("simple-idle");
    } else {
      for (const [tab, label] of [
        ["Color & Swatches", "swatches"],
        ["Properties", "properties"],
      ]) {
        await p
          .getByRole("button", { name: new RegExp(`^${tab}`) })
          .first()
          .click({ timeout: 8000 });
        await p.waitForTimeout(500);
        await scan(label);
      }
      for (const [tab, label] of [
        ["History", "history"],
        ["Navigator", "navigator"],
        ["Layers", "layers"],
      ]) {
        await p
          .getByRole("button", { name: new RegExp(`^${tab}`) })
          .first()
          .click({ timeout: 8000 });
        await p.waitForTimeout(500);
        await scan(label);
      }
    }
    await b.close();
  }
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch48.json",
  JSON.stringify(results, null, 2)
);
