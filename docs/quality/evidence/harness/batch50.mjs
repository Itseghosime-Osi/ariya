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

// ---- K12: motion ----------------------------------------------------------
for (const reduced of [false, true]) {
  const { b, p } = await open("pro", {
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const bx = await p
    .locator('[data-invitation-canvas] [data-layer-id="names"]')
    .evaluate((e) => e.getBoundingClientRect().toJSON());
  await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
  await p.keyboard.press("Control+z");
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const ms = (s) =>
      s
        .split(",")
        .map((x) =>
          x.trim().endsWith("ms") ? parseFloat(x) : parseFloat(x) * 1000
        );
    const trans = {};
    const anims = {};
    document
      .querySelectorAll(
        '[data-testid="invitation-designer"], [data-testid="invitation-designer"] *'
      )
      .forEach((e) => {
        if (e.closest("[data-invitation-canvas]")) return;
        const c = getComputedStyle(e);
        const td = ms(c.transitionDuration);
        const tp = c.transitionProperty.split(",");
        td.forEach((d, i) => {
          if (d > 0 && !/^(none)$/.test(tp[i % tp.length]?.trim()))
            trans[Math.round(d)] = (trans[Math.round(d)] || 0) + 1;
        });
        if (c.animationName !== "none") {
          const k = `${c.animationName}@${Math.round(ms(c.animationDuration)[0])}ms`;
          anims[k] = (anims[k] || 0) + 1;
        }
      });
    return { trans, anims };
  });
  data[reduced ? "motion-reduced" : "motion-normal"] = r;
  await b.close();
}
{
  const n = data["motion-normal"];
  const outside = Object.keys(n.trans)
    .map(Number)
    .filter((d) => d > 200);
  check(
    "RD-K12a",
    "Every studio transition is 200 ms or shorter",
    outside.length === 0,
    JSON.stringify(n.trans)
  );
  const rd = data["motion-reduced"];
  const longRd = Object.keys(rd.trans)
    .map(Number)
    .filter((d) => d > 1);
  check(
    "RD-K12b",
    "With reduced motion on, studio transitions are removed",
    longRd.length === 0,
    JSON.stringify({ trans: rd.trans, anims: rd.anims })
  );
}

// ---- L14: text 30% longer ---------------------------------------------------
for (const [mode, w, h, touch] of [
  ["pro", 1440, 900, false],
  ["pro", 390, 844, true],
  ["simple", 1440, 900, false],
  ["simple", 390, 844, true],
]) {
  const { b, p } = await open("pro" === mode ? "pro" : "simple", {
    viewport: { width: w, height: h },
    hasTouch: touch,
    isMobile: touch,
  });
  const scan = () =>
    p.evaluate(() => {
      const bad = [];
      document
        .querySelectorAll('[data-testid="invitation-designer"] *')
        .forEach((e) => {
          if (e.closest("[data-invitation-canvas]")) return;
          const r = e.getBoundingClientRect();
          if (!r.width) return;
          const cs = getComputedStyle(e);
          if (
            e.scrollWidth > e.clientWidth + 1 &&
            /hidden|clip/.test(cs.overflowX) &&
            !/ellipsis/.test(cs.textOverflow) &&
            e.children.length === 0 &&
            e.textContent.trim()
          )
            bad.push(`${e.tagName} "${e.textContent.trim().slice(0, 30)}"`);
        });
      return {
        clipped: bad,
        pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
  const base = await scan();
  await p.evaluate(() => {
    const walker = document.createTreeWalker(
      document.querySelector('[data-testid="invitation-designer"]'),
      NodeFilter.SHOW_TEXT
    );
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      const el = n.parentElement;
      if (!el || el.closest("[data-invitation-canvas]")) return;
      if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(el.tagName)) return;
      const t = n.textContent;
      if (t.trim().length < 3) return;
      n.textContent = t + t.slice(0, Math.max(1, Math.ceil(t.length * 0.3)));
    });
  });
  await p.waitForTimeout(400);
  const grown = await scan();
  const newly = grown.clipped.filter((x) => !base.clipped.includes(x));
  check(
    `RD-L14-${mode}-${w}`,
    `UI text 30% longer (${mode}, ${w}px): nothing newly clipped and no sideways page scroll`,
    newly.length === 0 && !grown.pageOverflow,
    JSON.stringify({
      newly: newly.slice(0, 8),
      pageOverflow: grown.pageOverflow,
    })
  );
  await p.screenshot({ path: `/tmp/l14-${mode}-${w}.png` });
  await b.close();
}

// ---- D3: Simple-mode wording audit ----------------------------------------
{
  const { b, p } = await open("simple");
  const labels = await p.evaluate(() => {
    const out = new Set();
    document
      .querySelectorAll(
        '[data-testid="invitation-designer"] button, [data-testid="invitation-designer"] label, [data-testid="invitation-designer"] h2, [data-testid="invitation-designer"] legend'
      )
      .forEach((e) => {
        if (
          e.closest("[data-invitation-canvas]") ||
          !e.getBoundingClientRect().width
        )
          return;
        const t = (e.getAttribute("aria-label") || e.textContent || "")
          .trim()
          .replace(/\s+/g, " ");
        if (t) out.add(t);
      });
    return [...out];
  });
  data["simple-labels"] = labels;
  const jargon = labels.filter((t) =>
    /\b(blend|distribute|opacity|gradient|kerning|tracking|leading|vector|raster|artboard|mask|bleed|dpi|px|rgb|hex|z-index|layer)\b/i.test(
      t
    )
  );
  check(
    "RD-D3-simple",
    "No unexplained jargon in Simple mode",
    jargon.length === 0,
    JSON.stringify({ count: labels.length, jargon })
  );
  await b.close();
}

// ---- D5: Back to the event from the studio -----------------------------------
{
  const { b, p } = await open("pro");
  const link = p.getByRole("link", { name: "Back to invitations" });
  const href = await link.getAttribute("href");
  await link.click();
  await p.waitForURL(/\/documentation/, { timeout: 15000 });
  check(
    "RD-D5",
    "One click on Back leaves the studio for the event's page",
    /\/documentation/.test(p.url()) && href === "/documentation",
    `href=${href}`
  );
  await b.close();
}

// ---- L7: announcements ---------------------------------------------------------
{
  const { b, p } = await open("pro");
  const bx = await p
    .locator('[data-invitation-canvas] [data-layer-id="names"]')
    .evaluate((e) => e.getBoundingClientRect().toJSON());
  await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
  await p.keyboard.press("ArrowRight");
  await p.waitForTimeout(300);
  await p.keyboard.press("Control+z");
  await p.waitForTimeout(500);
  const roles = await p.evaluate(() =>
    [
      ...document.querySelectorAll(
        '[role="status"], [role="alert"], [aria-live]'
      ),
    ]
      .filter(
        (e) => e.getBoundingClientRect().width > 0 && e.textContent.trim()
      )
      .map(
        (e) =>
          `${e.getAttribute("role") || "live"}:${e.textContent.trim().slice(0, 30)}`
      )
  );
  check(
    "RD-L7-live",
    "The undo notice is announced (role=status) and so is the save status",
    roles.some((r) => /^status:(Undone|Redone|Nothing)/i.test(r)) &&
      roles.some((r) => /^status:/.test(r)),
    JSON.stringify(roles)
  );
  await b.close();
}

// ---- B3: a blocked font is announced after the export -----------------------------
{
  const { b, p } = await open("pro", {}, async (pg) => {
    await pg.route(/\.(woff2?|ttf|otf)(\?.*)?$/, (r) => r.abort());
  });
  await p.getByRole("button", { name: "Export", exact: true }).click();
  await p
    .getByRole("button")
    .filter({ hasText: "High-Resolution PNG" })
    .click();
  const dl = p.waitForEvent("download", { timeout: 60000 }).catch(() => null);
  await p.getByRole("button", { name: "Download PNG", exact: true }).click();
  const d = await dl;
  await p.waitForTimeout(800);
  const status = await p
    .getByRole("status")
    .filter({ hasText: /could not be loaded/ })
    .innerText()
    .catch(() => "");
  check(
    "RD-B3",
    "With fonts blocked the file still downloads and the host is told which font was missing",
    !!d && /could not be loaded/.test(status) && /export again/i.test(status),
    `download=${d ? d.suggestedFilename() : "none"} notice="${status.slice(0, 120)}"`
  );
  await b.close();
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
