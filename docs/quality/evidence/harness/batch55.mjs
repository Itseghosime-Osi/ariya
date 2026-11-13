import pw from "/home/user/ariya/node_modules/.pnpm/playwright-core@1.64.1/node_modules/playwright-core/index.js";
import { writeFileSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
const { chromium, firefox, webkit } = pw;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const URL = `${process.env.BASE ?? "http://localhost:3000"}/documentation/${process.env.FIX ?? "zz-fixture"}?mode=pro`;
const FORMATS = [
  ["png", "High-Resolution PNG", "Download PNG"],
  ["jpeg", "Compressed JPEG", "Download JPEG"],
  ["pdf", "PDF for printing", "Download PDF"],
  ["json", "Design Backup (.json)", "Download JSON"],
];
const out = {};
const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];
// decode a PNG's pixel at fractions using node zlib (8-bit RGB/RGBA, non-interlaced)
function pngPixel(buf, fx, fy) {
  const w = buf.readUInt32BE(16),
    h = buf.readUInt32BE(20);
  const colorType = buf[25];
  const bpp = colorType === 6 ? 4 : 3;
  let off = 8,
    idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    if (type === "IDAT") idat.push(buf.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp + 1;
  const px = new Uint8Array(w * h * bpp);
  for (let y = 0; y < h; y++) {
    const f = raw[y * stride];
    for (let x = 0; x < w * bpp; x++) {
      const v = raw[y * stride + 1 + x];
      const a = x >= bpp ? px[y * w * bpp + x - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * w * bpp + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * w * bpp + x - bpp] : 0;
      let r;
      if (f === 0) r = v;
      else if (f === 1) r = v + a;
      else if (f === 2) r = v + b;
      else if (f === 3) r = v + ((a + b) >> 1);
      else {
        const p = a + b - c,
          pa = Math.abs(p - a),
          pb = Math.abs(p - b),
          pc = Math.abs(p - c);
        r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      px[y * w * bpp + x] = r & 255;
    }
  }
  const x = Math.min(w - 1, Math.floor(fx * w)),
    y = Math.min(h - 1, Math.floor(fy * h));
  const i = (y * w + x) * bpp;
  return [px[i], px[i + 1], px[i + 2]];
}
for (const [name, type] of [
  ["chromium", chromium],
  ["firefox", firefox],
  ["webkit", webkit],
]) {
  const exe =
    name === "chromium" ? { executablePath: "/opt/pw-browsers/chromium" } : {};
  let b;
  try {
    b = await type.launch(exe);
  } catch (e) {
    check(
      `RD-B1-launch-${name}`,
      `${name} starts`,
      false,
      String(e.message).split("\n")[0]
    );
    continue;
  }
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor({ timeout: 90000 });
  await p.waitForTimeout(1500);
  out[name] = {};
  for (const [fmt, card, button] of FORMATS) {
    try {
      await p.getByRole("button", { name: "Export", exact: true }).click();
      await p.getByRole("button").filter({ hasText: card }).click();
      const dl = p.waitForEvent("download", { timeout: 90000 });
      await p.getByRole("button", { name: button, exact: true }).click();
      const d = await dl;
      const path = `/tmp/xb-${name}-${fmt}`;
      await d.saveAs(path);
      const buf = readFileSync(path);
      const rec = { file: d.suggestedFilename(), bytes: buf.length };
      if (fmt === "png") {
        rec.size = pngSize(buf);
        rec.centre = pngPixel(buf, 0.5, 0.5);
        rec.paper = pngPixel(buf, 0.12, 0.35);
      }
      out[name][fmt] = rec;
      await p.keyboard.press("Escape").catch(() => {});
      await p.waitForTimeout(300);
    } catch (e) {
      out[name][fmt] = { error: String(e.message).split("\n")[0] };
      await p.keyboard.press("Escape").catch(() => {});
    }
  }
  await b.close();
}
console.log(JSON.stringify(out, null, 1));
for (const name of ["chromium", "firefox", "webkit"]) {
  const o = out[name];
  if (!o) continue;
  check(
    `RD-B1-formats-${name}`,
    `${name}: all four exports download`,
    FORMATS.every(([f]) => o[f] && !o[f].error),
    JSON.stringify(
      Object.fromEntries(
        Object.entries(o).map(([k, v]) => [k, v.error ?? v.file])
      )
    )
  );
}
if (out.chromium?.png && out.firefox?.png && out.webkit?.png) {
  const dist = (a, b2) => Math.hypot(a[0] - b2[0], a[1] - b2[1], a[2] - b2[2]);
  for (const name of ["firefox", "webkit"]) {
    check(
      `RD-B1-size-${name}`,
      `${name} PNG has the same pixel size as Chromium`,
      JSON.stringify(out[name].png.size) ===
        JSON.stringify(out.chromium.png.size),
      `${out[name].png.size} vs ${out.chromium.png.size}`
    );
    check(
      `RD-B1-pixels-${name}`,
      `${name} PNG matches Chromium at two sampled points (within 12 of 441)`,
      dist(out[name].png.centre, out.chromium.png.centre) < 12 &&
        dist(out[name].png.paper, out.chromium.png.paper) < 12,
      JSON.stringify({
        centre: [out[name].png.centre, out.chromium.png.centre],
        paper: [out[name].png.paper, out.chromium.png.paper],
      })
    );
  }
}
for (const name of ["firefox", "webkit"]) {
  const o = out[name];
  if (!o) continue;
  check(
    `RD-B6-names-${name}`,
    `${name}: files are named from the event, like Chromium`,
    FORMATS.every(([f]) => o[f]?.file === out.chromium?.[f]?.file),
    JSON.stringify(
      Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.file]))
    )
  );
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch55.json",
  JSON.stringify({ results, out }, null, 2)
);
