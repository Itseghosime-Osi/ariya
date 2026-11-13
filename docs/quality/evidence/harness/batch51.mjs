import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const data = {};
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const URL = `${process.env.BASE ?? "http://localhost:3000"}/documentation/zz-fixture`;
async function open(mode, opts = {}, route) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    ...opts,
  });
  const p = await ctx.newPage();
  if (route) await route(p);
  await p.goto(`${URL}?mode=${mode}`);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(900);
  return { b, p, ctx };
}

// ---- E1 / E2 / E4: performance with a throttled CPU --------------------------------
async function perf(label, throttle, layersWanted) {
  const { b, p, ctx } = await open("pro", {
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const cdp = await ctx.newCDPSession(p);
  if (throttle > 1)
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  await p.evaluate(() => {
    window.__long = [];
    new PerformanceObserver((l) =>
      l.getEntries().forEach((e) => window.__long.push(e.duration))
    ).observe({ entryTypes: ["longtask"] });
  });
  const bx = await p
    .locator('[data-invitation-canvas] [data-layer-id="names"]')
    .evaluate((e) => e.getBoundingClientRect().toJSON());
  await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
  for (let i = 0; i < layersWanted - 10; i++) {
    await p.keyboard.press("Control+j");
    await p.waitForTimeout(20);
  }
  await p.waitForTimeout(800);
  const count = (await p.$$("[data-invitation-canvas] [data-layer-id]")).length;
  const box = await p
    .locator("[data-invitation-canvas] [data-layer-id]")
    .last()
    .evaluate((e) => e.getBoundingClientRect().toJSON());
  await p.evaluate(() => {
    window.__long = [];
  });
  const frames = await p.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const tick = (t) => {
      window.__frames.push(t - last);
      last = t;
      window.__raf = requestAnimationFrame(tick);
    };
    window.__raf = requestAnimationFrame(tick);
    return true;
  });
  const sx = box.x + box.width / 2,
    sy = box.y + box.height / 2;
  await p.mouse.move(sx, sy);
  await p.mouse.down();
  for (let i = 0; i < 40; i++) {
    await p.mouse.move(sx + (i % 2 ? 30 : -30), sy + i, { steps: 1 });
    await p.waitForTimeout(16);
  }
  await p.mouse.up();
  const r = await p.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    const f = [...window.__frames].sort((a, b) => a - b);
    const q = (x) =>
      Math.round(f[Math.min(f.length - 1, Math.floor(f.length * x))] * 10) / 10;
    const long = window.__long;
    return {
      frames: f.length,
      p50: q(0.5),
      p95: q(0.95),
      max: Math.round(f[f.length - 1]),
      longTasks: long.length,
      longMax: Math.round(Math.max(0, ...long)),
      longOver100: long.filter((d) => d > 100).length,
    };
  });
  data[`perf-${label}`] = { layers: count, ...r };
  await b.close();
  return { layers: count, ...r };
}
{
  const a = await perf("1x", 1, 60);
  const c = await perf("4x", 4, 60);
  check(
    "RD-E1",
    "Dragging with the studio's maximum layers stays under the 100 ms budget at the 95th percentile, also with a 4x slower CPU",
    c.p95 < 100 && a.p95 < 100,
    JSON.stringify({ normal: a, slow4x: c })
  );
  check(
    "RD-E2",
    "Long tasks while dragging are listed (none over 100 ms at normal speed)",
    a.longOver100 === 0,
    JSON.stringify({
      normal: { longTasks: a.longTasks, longMax: a.longMax },
      slow4x: {
        longTasks: c.longTasks,
        longMax: c.longMax,
        over100: c.longOver100,
      },
    })
  );
}
for (const [label, cpu, net] of [
  ["desktop", 1, null],
  [
    "phone-throttled",
    4,
    { latency: 150, down: (1.6 * 1024 * 1024) / 8, up: (750 * 1024) / 8 },
  ],
]) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const ctx = await b.newContext({
    viewport:
      label === "desktop"
        ? { width: 1440, height: 900 }
        : { width: 390, height: 844 },
    hasTouch: label !== "desktop",
    isMobile: label !== "desktop",
  });
  const p = await ctx.newPage();
  // warm the dev server's compile cache so the measurement is the page, not the compiler
  await p.goto(`${URL}?mode=simple`);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  const cdp = await ctx.newCDPSession(p);
  if (cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  if (net) {
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: net.latency,
      downloadThroughput: net.down,
      uploadThroughput: net.up,
    });
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  }
  const t0 = Date.now();
  await p.goto(`${URL}?mode=simple`, { waitUntil: "commit" });
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor({ timeout: 120000 });
  const ready = Date.now() - t0;
  const field = p.getByRole("textbox").first();
  await field.click();
  await field.press("End");
  await field.type("x");
  const interactive = Date.now() - t0;
  data[`open-${label}`] = { cardVisibleMs: ready, firstTypedMs: interactive };
  await b.close();
}
check(
  "RD-E4",
  "Time to a visible card and to the first typed letter is recorded for desktop and a throttled phone",
  data["open-desktop"] && data["open-phone-throttled"],
  JSON.stringify({
    desktop: data["open-desktop"],
    phone: data["open-phone-throttled"],
  })
);
writeFileSync(
  process.argv[2] ?? "/tmp/batch50.json",
  JSON.stringify({ results, data }, null, 2)
);
