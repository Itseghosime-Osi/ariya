import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { execFileSync } from "node:child_process";
import { readdirSync, renameSync, rmSync } from "node:fs";
const { chromium } = pw;
const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = "/home/user/ariya/apps/web/public/help";
const only = process.env.ONLY?.split(",");
const clips = {
  move: async (p) => {
    const bx = await p
      .locator('[data-invitation-canvas] [data-layer-id="names"]')
      .evaluate((e) => e.getBoundingClientRect().toJSON());
    const x = bx.x + bx.width / 2,
      y = bx.y + bx.height / 2;
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.mouse.move(x + 60, y + 40, { steps: 12 });
    await p.mouse.move(x - 40, y - 30, { steps: 14 });
    await p.mouse.up();
    await p.waitForTimeout(900);
  },
  text: async (p) => {
    const c = await p
      .locator("[data-invitation-canvas]")
      .first()
      .evaluate((e) => e.getBoundingClientRect().toJSON());
    await p.keyboard.press("t");
    await p.waitForTimeout(700);
    await p.mouse.move(c.x + c.width * 0.2, c.y + c.height * 0.62, {
      steps: 8,
    });
    await p.mouse.down();
    await p.mouse.move(c.x + c.width * 0.8, c.y + c.height * 0.7, {
      steps: 14,
    });
    await p.mouse.up();
    await p.waitForTimeout(700);
    await p.keyboard.type("Come and celebrate", { delay: 60 });
    await p.waitForTimeout(900);
  },
  shape: async (p) => {
    const c = await p
      .locator("[data-invitation-canvas]")
      .first()
      .evaluate((e) => e.getBoundingClientRect().toJSON());
    await p.keyboard.press("o");
    await p.waitForTimeout(700);
    await p.mouse.move(c.x + c.width * 0.3, c.y + c.height * 0.45, {
      steps: 8,
    });
    await p.mouse.down();
    await p.mouse.move(c.x + c.width * 0.7, c.y + c.height * 0.62, {
      steps: 16,
    });
    await p.mouse.up();
    await p.waitForTimeout(1500);
  },
  seal: async (p) => {
    await p.keyboard.press("b");
    await p.waitForTimeout(2200);
  },
  export: async (p) => {
    await p.getByRole("button", { name: "Export", exact: true }).click();
    await p.waitForTimeout(1200);
    await p
      .getByRole("button")
      .filter({ hasText: "High-Resolution PNG" })
      .click();
    await p.waitForTimeout(1500);
  },
};
for (const [name, run] of Object.entries(clips)) {
  if (only && !only.includes(name)) continue;
  rmSync("/tmp/vid", { recursive: true, force: true });
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const ctx = await b.newContext({
    viewport: { width: 1100, height: 700 },
    recordVideo: { dir: "/tmp/vid", size: { width: 1100, height: 700 } },
  });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/documentation/zz-fixture?mode=pro`);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor({ timeout: 90000 });
  await p.waitForTimeout(1500);
  const t0 = Date.now();
  await run(p);
  await ctx.close();
  await b.close();
  const file = readdirSync("/tmp/vid").find((f) => f.endsWith(".webm"));
  const full = `/tmp/vid/${file}`;
  // skip the page-load part: the clip starts a little before the action began
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-sseof",
      "-" + Math.max(3, (Date.now() - t0) / 1000 + 0.4).toFixed(1),
      "-i",
      full,
      "-vf",
      "fps=8,scale=560:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
      "-loop",
      "0",
      `${OUT}/${name}.gif`,
    ],
    { stdio: "ignore" }
  );
}
console.log("done");
