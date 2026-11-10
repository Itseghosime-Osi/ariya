import { chromium } from "playwright";
export const URL = "http://localhost:3000/documentation/zz-fixture";
export async function open(opts = {}) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const ctx = await b.newContext({
    viewport: opts.viewport ?? { width: 1440, height: 900 },
    hasTouch: !!opts.touch,
    reducedMotion: opts.reducedMotion,
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(`${URL}?mode=${opts.mode ?? "pro"}`);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(800);
  return { b, p, errs };
}
export const results = [];
export function check(id, name, ok, detail = "") {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
}
export async function layers(p) {
  return p.$$eval("[data-invitation-canvas] [data-layer-id]", (els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return {
        id: e.getAttribute("data-layer-id"),
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        text: (e.textContent || "").slice(0, 30),
      };
    })
  );
}
export const centre = (l) => ({ x: l.x + l.w / 2, y: l.y + l.h / 2 });
