import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const URL = "http://localhost:3000/documentation/zz-fixture?mode=simple";
for (const [w, h, touch] of [
  [1440, 900, false],
  [390, 844, true],
]) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const p = await (
    await b.newContext({
      viewport: { width: w, height: h },
      hasTouch: touch,
      isMobile: touch,
    })
  ).newPage();
  await p.goto(URL);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(900);
  if (touch) {
    const t = p
      .getByRole("button", { name: /^(Edit|Words|Simple|Panel)/ })
      .first();
  }
  const panel = p.locator('[data-testid="simple-panel"]:visible').first();
  await panel.waitFor();
  const r = await panel.evaluate((root) => {
    const heads = [...root.querySelectorAll("section h2")].map((e) =>
      e.textContent.trim().replace(/^▾/, "")
    );
    const card = [...root.querySelectorAll("section")].find((s) =>
      /Use your own card/.test(s.querySelector("h2")?.textContent || "")
    );
    const btn = card?.querySelector("h2 button");
    const row = [...root.querySelectorAll("label")].find(
      (l) => l.textContent.trim() === "Show"
    );
    const word = row?.parentElement.querySelector("label");
    const c = (e) => {
      const r = e.getBoundingClientRect();
      return Math.round(r.top + r.height / 2);
    };
    return {
      heads,
      expanded: btn?.getAttribute("aria-expanded"),
      showY: row ? c(row) : null,
      wordY: word ? c(word) : null,
    };
  });
  check(
    `RD-F1-${w}`,
    "Words come first; 'Use your own card' is lower down and starts folded",
    r.heads[0] === "Words" &&
      r.heads.indexOf("Use your own card") > 0 &&
      r.expanded === "false",
    JSON.stringify(r.heads) + " expanded=" + r.expanded
  );
  check(
    `RD-F3-${w}`,
    "Each field's label and its Show checkbox sit on one line",
    r.showY !== null && Math.abs(r.showY - r.wordY) <= 1,
    JSON.stringify({ showY: r.showY, wordY: r.wordY })
  );
  await p.screenshot({ path: `/tmp/tidy-f-after-${w}.png` });
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch41.json",
  JSON.stringify(results, null, 2)
);
