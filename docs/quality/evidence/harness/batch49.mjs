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
const URL = `${process.env.BASE ?? "http://localhost:3000"}/documentation/zz-fixture?mode=pro`;
async function open(extra = {}) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    ...extra,
  });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(900);
  return { b, p };
}
const layerCount = async (p) =>
  (await p.$$("[data-invitation-canvas] [data-layer-id]")).length;

// K3: seal shortcuts
{
  const { b, p } = await open();
  const tip = await p.evaluate(() =>
    Object.fromEntries(
      [
        ...document.querySelectorAll(
          '[role="toolbar"][aria-label="Design tools"] button'
        ),
      ]
        .filter((e) => /seal/i.test(e.getAttribute("aria-label") || ""))
        .map((e) => [e.getAttribute("aria-label"), e.getAttribute("title")])
    )
  );
  check(
    "RD-K3-shortcuts",
    "Both seal tools show a shortcut in their tooltip",
    Object.values(tip).length === 2 &&
      Object.values(tip).every((t) => /\((B|Q)\)/.test(t)),
    JSON.stringify(tip)
  );
  const before = await layerCount(p);
  await p.mouse.click(700, 120);
  await p.keyboard.press("b");
  await p.waitForTimeout(500);
  const after = await layerCount(p);
  check("RD-K3-B", "Pressing B adds a monogram seal", after === before + 1, `${before} -> ${after}`);
  await p.keyboard.press("q");
  await p.waitForTimeout(400);
  const after2 = await layerCount(p);
  check(
    "RD-K3-Q",
    "Pressing Q does not add a second entry seal when one is there",
    after2 === after,
    `${after} -> ${after2}`
  );
  await p.keyboard.press("?");
  await p.getByTestId("studio-help").waitFor();
  const help = await p.getByTestId("studio-help").innerText();
  check(
    "RD-K3-help",
    "Help lists both new shortcuts",
    /Monogram seal\s*B/.test(help) && /Guest pass seal\s*Q/.test(help)
  );
  await b.close();
}

// L11: guest preview
{
  const { b, p } = await open();
  await p.getByRole("button", { name: "View" }).click();
  await p.getByRole("menuitem", { name: /See it as a guest/ }).click();
  const dlg = p.getByTestId("guest-preview");
  await dlg.waitFor();
  const text = await dlg.innerText();
  check(
    "RD-L11a",
    "View > See it as a guest shows the card and what guests get",
    /Adaeze/.test(text) &&
      /What a guest gets/.test(text) &&
      /What stays with you/.test(text),
    text.slice(0, 80).replace(/\n/g, " ")
  );
  check(
    "RD-L11b",
    "No guest link or real code is shown",
    !/https?:\/\//i.test(text) && !/[?&]code=/i.test(text) && /sample code/.test(text)
  );
  const ax = await new Axe({ page: p })
    .withTags(["wcag2a", "wcag2aa"])
    .include('[data-testid="guest-preview"]')
    .analyze();
  const bad = ax.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact)
  );
  check("RD-L11c", "The guest preview passes axe", bad.length === 0, bad.map((v) => v.id).join(","));
  await p.screenshot({ path: "/tmp/guest-preview.png" });
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  check("RD-L11d", "Escape closes it", (await p.getByTestId("guest-preview").count()) === 0);
  await b.close();
}

// F2: forced export failure shows what happened + a next step + Try again, and Try again works
{
  const { b, p } = await open();
  await p.evaluate(() => {
    window.__failExport = true;
    const od = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...a) {
      if (window.__failExport)
        throw new Error("Boom: Failed to execute 'toDataURL'");
      return od.apply(this, a);
    };
    const ob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (...a) {
      if (window.__failExport)
        throw new Error("Boom: Failed to execute 'toBlob'");
      return ob.apply(this, a);
    };
  });
  await p.getByRole("button", { name: "Export", exact: true }).click();
  await p.getByRole("button").filter({ hasText: "High-Resolution PNG" }).click();
  await p.getByRole("button", { name: "Download PNG", exact: true }).click();
  const alert = p.getByRole("dialog").getByRole("alert");
  await alert.waitFor({ timeout: 30000 });
  const msg = await alert.innerText();
  check(
    "RD-F2-export",
    "A failed export says what happened and what to do, without the raw browser error",
    /could not be made/i.test(msg) &&
      /try again|another format/i.test(msg) &&
      !/Boom|toBlob|toDataURL/.test(msg),
    msg.replace(/\n/g, " | ")
  );
  check("RD-F2-retry", "There is a Try again button next to the error", (await p.getByTestId("export-retry").count()) === 1);
  await p.evaluate(() => {
    window.__failExport = false;
  });
  const dl = p.waitForEvent("download", { timeout: 60000 });
  await p.getByTestId("export-retry").click();
  const d = await dl.catch(() => null);
  check(
    "RD-F2-retry-works",
    "Try again repeats the export and downloads the file",
    !!d && /\.png$/i.test(d.suggestedFilename()),
    d ? d.suggestedFilename() : "no download"
  );
  await b.close();
}

// K6: 50 layers
{
  const { b, p } = await open();
  const names = p.locator('[data-invitation-canvas] [data-layer-id="names"]');
  const bx = await names.evaluate((e) => e.getBoundingClientRect().toJSON());
  await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press("Control+j");
    await p.waitForTimeout(40);
  }
  await p.waitForTimeout(800);
  const n = await layerCount(p);
  await p.getByRole("button", { name: /^Layers/ }).first().click();
  await p.waitForTimeout(500);
  const dock = p.locator('[data-testid="layers-dock"]:visible').first();
  const info = await dock.evaluate((d) => {
    const rows = [
      ...d.querySelectorAll('button[aria-label="Drag to reorder layer"]'),
    ].map((g) => g.closest("[class*=min-h-]"));
    let sc = rows[0]?.parentElement;
    while (sc && sc !== d && !/(auto|scroll)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
    if (sc === d) sc = null;
    const hs = [
      ...new Set(
        rows.filter(Boolean).map((r) => Math.round(r.getBoundingClientRect().height))
      ),
    ];
    return {
      rows: rows.length,
      heights: hs,
      scrolls: !!sc && sc.scrollHeight > sc.clientHeight,
    };
  });
  check(
    "RD-K6-50",
    "50 layers: one row height and the list scrolls",
    n >= 50 && info.rows >= 50 && info.heights.length === 1 && info.scrolls,
    JSON.stringify({ layersOnCard: n, ...info })
  );
  const firstRow = dock
    .locator('button[aria-label="Drag to reorder layer"]')
    .first()
    .locator("xpath=ancestor::*[contains(@class,'min-h-')][1]");
  await firstRow.dblclick();
  const input = p.getByLabel("Layer name");
  const renamed = await input
    .waitFor({ timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (renamed) {
    await input.fill("Renamed layer");
    await p.keyboard.press("Enter");
    await p.waitForTimeout(300);
  }
  check(
    "RD-K6-rename",
    "Inline rename works with 50 layers",
    renamed && (await dock.getByText("Renamed layer").count()) >= 1
  );
  await p.screenshot({ path: "/tmp/layers-50.png" });
  await b.close();
}
writeFileSync(process.argv[2] ?? "/tmp/batch49.json", JSON.stringify(results, null, 2));
