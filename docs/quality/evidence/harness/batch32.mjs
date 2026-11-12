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
  ["light", false],
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
  await p.keyboard.press("Control+e");
  await p.getByTestId("export-summary").waitFor();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `/tmp/export-${tag}.png` });
  const r = await new Axe({ page: p })
    .withTags(["wcag2a", "wcag2aa"])
    .include('[aria-labelledby="export-dialog-title"]')
    .analyze();
  const bad = r.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact)
  );
  check(
    `RD-EXP-axe-${tag}`,
    `axe: no serious/critical issues in the export dialog (${tag})`,
    bad.length === 0,
    bad
      .map((v) => `${v.id}:${v.nodes[0].target.join(" ")}`)
      .join(" ; ")
      .slice(0, 300)
  );
  const dl = await p
    .getByRole("button", { name: /^Download PDF/ })
    .boundingBox();
  const panel = await p
    .locator('[aria-labelledby="export-dialog-title"] > div')
    .first()
    .boundingBox();
  check(
    `RD-EXP-footer-${tag}`,
    "Download button is visible without scrolling",
    dl && dl.y + dl.height <= 900 && dl.y >= 0,
    `bottom=${dl && Math.round(dl.y + dl.height)}`
  );
  check(
    `RD-EXP-fit-${tag}`,
    "Dialog fits the screen",
    panel.y >= 0 && panel.y + panel.height <= 900,
    `h=${Math.round(panel.height)}`
  );
  if (os === "light" && !studioDark) {
    const cards = await p.locator('[id^="export-format-"]').count();
    const pressed = await p
      .locator('[id^="export-format-"][aria-pressed="true"]')
      .count();
    check(
      "RD-EXP-cards",
      "Five format cards, one pressed",
      cards === 5 && pressed === 1,
      `${cards}/${pressed}`
    );
    check(
      "RD-EXP-focus",
      "Focus lands on the selected format",
      (await p.evaluate(() => document.activeElement?.id)) ===
        "export-format-pdf"
    );
    await p.locator("#export-format-png").click();
    check(
      "RD-EXP-select",
      "Choosing a card updates the summary and button",
      /High-Resolution PNG/.test(
        await p.getByTestId("export-summary").innerText()
      ) &&
        (await p
          .getByRole("button", { name: "Download PNG", exact: true })
          .count()) === 1
    );
    const bt = await p
      .locator('[id^="export-format-"]')
      .evaluateAll((els) =>
        els.map((e) => Math.round(e.getBoundingClientRect().height))
      );
    check(
      "RD-EXP-heights",
      "Cards in a row share one height",
      bt[0] === bt[1] && bt[2] === bt[3],
      bt.join(",")
    );
    await p.locator("#export-format-json").click();
    const dl2 = p.waitForEvent("download", { timeout: 20000 });
    await p.getByRole("button", { name: "Download JSON", exact: true }).click();
    check(
      "RD-EXP-json",
      "Backup still downloads",
      /\.json$/.test((await dl2).suggestedFilename())
    );
  }
  await ctx.close();
  await b.close();
}
// phone
{
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    colorScheme: "dark",
  });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(800);
  await p.getByRole("button", { name: "Export", exact: true }).first().click();
  await p.getByTestId("export-summary").waitFor();
  await p.waitForTimeout(300);
  await p.screenshot({ path: "/tmp/export-phone.png" });
  const dl = await p
    .getByRole("button", { name: /^Download PDF/ })
    .boundingBox();
  check(
    "RD-EXP-phone-footer",
    "Phone: Download button visible without scrolling",
    dl && dl.y + dl.height <= 844,
    `bottom=${dl && Math.round(dl.y + dl.height)}`
  );
  check(
    "RD-EXP-phone-h",
    "Phone: Download button is 44px or taller",
    dl && dl.height >= 44,
    `${dl && dl.height}`
  );
  await ctx.close();
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch32.json",
  JSON.stringify(results, null, 2)
);
