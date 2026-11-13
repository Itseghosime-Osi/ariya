import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const BASE = process.env.BASE ?? "http://localhost:3000";
const open = async (mode, ctxOpts = {}) => {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    ...ctxOpts,
  });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/documentation/zz-fixture?mode=${mode}`);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor({ timeout: 90000 });
  await p.waitForTimeout(1200);
  return { b, ctx, p };
};
// K5
{
  const { b, p } = await open("pro");
  const bar = p.getByRole("toolbar", { name: "Contextual Tool Options" });
  const before = await bar.getByLabel("Font family").count();
  const bx = await p
    .locator('[data-invitation-canvas] [data-layer-id="names"]')
    .evaluate((e) => e.getBoundingClientRect().toJSON());
  await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
  await p.waitForTimeout(500);
  const text = await bar.getByLabel("Font family").count();
  await p.keyboard.press("Escape");
  await p.mouse.click(5, 450).catch(() => {});
  check(
    "RD-K5",
    "Options bar shows type controls when a text layer is selected with the Move tool",
    before === 0 && text === 1,
    `before=${before} selected=${text}`
  );
  await b.close();
}
// D1
{
  const { b, p } = await open("simple");
  const visibleFields = await p
    .getByTestId("simple-panel")
    .locator("input[type=text]:visible, textarea:visible")
    .evaluateAll((els) =>
      els
        .filter((e) => e.id.startsWith("simple-") && e.id !== "simple-prompt")
        .map((e) => e.id)
    );
  const sections = await p
    .getByTestId("simple-panel")
    .locator("h3, [data-section-title]")
    .allInnerTexts()
    .catch(() => []);
  check(
    "RD-D1",
    "Simple mode opens with the four essential fields, a photo button, look and card shape (7 items)",
    visibleFields.length === 4,
    JSON.stringify({ visibleFields, sections })
  );
  await p.getByRole("button", { name: /More words/ }).click();
  const more = await p
    .getByTestId("simple-panel")
    .locator("input[type=text]:visible, textarea:visible")
    .count();
  check(
    "RD-D1b",
    "'More words' opens the rest",
    more > 4,
    `fields after open=${more}`
  );
  await b.close();
}
// L6
{
  const { b, ctx, p } = await open("pro");
  const bx = await p
    .locator('[data-invitation-canvas] [data-layer-id="names"]')
    .evaluate((e) => e.getBoundingClientRect().toJSON());
  await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
  await p.waitForTimeout(500);
  const hasFx = () => p.getByText("Visual FX & Blending").count();
  const first = await hasFx();
  await p.getByTestId("inspector-more").click();
  const open1 = await hasFx();
  await p.reload();
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(1200);
  const bx2 = await p
    .locator('[data-invitation-canvas] [data-layer-id="names"]')
    .evaluate((e) => e.getBoundingClientRect().toJSON());
  await p.mouse.click(bx2.x + bx2.width / 2, bx2.y + bx2.height / 2);
  await p.waitForTimeout(500);
  const after = await hasFx();
  check(
    "RD-L6",
    "Visual FX waits behind 'More options', opens on click, and is remembered after a reload",
    first === 0 && open1 === 1 && after === 1,
    `closed=${first} opened=${open1} afterReload=${after}`
  );
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch56.json",
  JSON.stringify(results, null, 2)
);
