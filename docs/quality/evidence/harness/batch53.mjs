import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync, readFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const BASE = process.env.BASE ?? "http://localhost:3000";
const URL = `${BASE}/documentation/zz-fixture`;
async function open(mode, opts = {}) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    ...opts,
  });
  const p = await ctx.newPage();
  await p.goto(`${URL}?mode=${mode}`);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(900);
  return { b, p };
}

// ---- A4: print PDF with bleed, crop marks and a size note ---------------------------
{
  const { b, p } = await open("pro");
  await p.getByRole("button", { name: "Export", exact: true }).click();
  await p.getByRole("button").filter({ hasText: "PDF for printing" }).click();
  await p.getByTestId("export-print-marks").check();
  const dl = p.waitForEvent("download", { timeout: 90000 });
  await p.getByRole("button", { name: "Download PDF", exact: true }).click();
  const d = await dl;
  const path = "/tmp/print-test.pdf";
  await d.saveAs(path);
  const pdfjs =
    await import("/home/user/ariya/apps/web/node_modules/pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(readFileSync(path)),
  }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const text = (await page.getTextContent()).items.map((i) => i.str).join(" ");
  check(
    "RD-A4a",
    "The print PDF has one page of 5.75 x 7.75 in (card, bleed and margin) at true size",
    doc.numPages === 1 &&
      Math.abs(vp.width - 414) < 1 &&
      Math.abs(vp.height - 558) < 1,
    `pages=${doc.numPages} size=${vp.width}x${vp.height}pt`
  );
  check(
    "RD-A4b",
    "The margin carries a plain size note (trim size, bleed, resolution, crop marks)",
    /Trim size 5 x 7 in/.test(text) &&
      /bleed 0.125 in/.test(text) &&
      /300 DPI/.test(text) &&
      /crop marks/.test(text),
    text.slice(0, 120)
  );
  await b.close();
}

// ---- K1: one primary action per studio state ---------------------------------------------
async function primaries(p) {
  return p.evaluate(() => {
    const out = [];
    const dialog = document.querySelector(
      '[role="dialog"][data-state="open"], [role="dialog"]'
    );
    const scope =
      dialog && dialog.getBoundingClientRect().width
        ? dialog
        : document.querySelector('[data-testid="invitation-designer"]');
    scope.querySelectorAll("button").forEach((e) => {
      if (e.closest("[data-invitation-canvas]")) return;
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const label = (
        e.getAttribute("aria-label") ||
        e.textContent ||
        ""
      ).trim();
      if (!/^(Export|Download|Update|Apply|Import|Save)\b/.test(label)) return;
      const m = getComputedStyle(e).backgroundColor.match(
        /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/
      );
      if (!m) return;
      const [R, G, B] = [m[1], m[2], m[3]].map(Number);
      const a = m[4] === undefined ? 1 : Number(m[4]);
      const wine = R > 70 && R < 130 && G < 50 && B < 70;
      const gold = R > 200 && G > 170 && B > 90 && B < 140;
      if (a > 0.9 && (wine || gold)) out.push(label.slice(0, 30));
    });
    return out;
  });
}
{
  const states = [];
  for (const [label, mode, steps] of [
    ["pro idle", "pro", async () => {}],
    [
      "pro selected layer",
      "pro",
      async (p) => {
        const bx = await p
          .locator('[data-invitation-canvas] [data-layer-id="names"]')
          .evaluate((e) => e.getBoundingClientRect().toJSON());
        await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
        await p.waitForTimeout(400);
      },
    ],
    [
      "pro history panel open",
      "pro",
      async (p) => {
        await p
          .getByRole("button", { name: /^History/ })
          .first()
          .click();
        await p.waitForTimeout(400);
      },
    ],
    [
      "pro export dialog",
      "pro",
      async (p) => {
        await p.getByRole("button", { name: "Export", exact: true }).click();
        await p.waitForTimeout(500);
      },
    ],
    ["simple idle", "simple", async () => {}],
  ]) {
    const { b, p } = await open(mode);
    await steps(p);
    states.push({ label, primaries: await primaries(p) });
    await b.close();
  }
  const bad = states.filter((s) => s.primaries.length !== 1);
  check(
    "RD-K1",
    "Every studio state shows exactly one solid primary action",
    bad.length === 0,
    JSON.stringify(states)
  );
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch53.json",
  JSON.stringify(results, null, 2)
);
