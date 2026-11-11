import { open, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
let captured = [];
await p.route("**/invitations/upload", async (route) => {
  const buf = route.request().postDataBuffer();
  captured.push(buf);
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      url: "http://localhost:3000/icons/icon-maskable-512.png",
    }),
  });
});
function png(buf) {
  const i = buf.indexOf(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (i >= 0)
    return {
      type: "png",
      width: buf.readUInt32BE(i + 16),
      height: buf.readUInt32BE(i + 20),
    };
  const r = buf.indexOf("RIFF");
  if (
    r >= 0 &&
    buf.subarray(r + 8, r + 12).toString() === "WEBP" &&
    buf.subarray(r + 12, r + 16).toString() === "VP8X"
  )
    return {
      type: "webp",
      width: 1 + (buf[r + 24] | (buf[r + 25] << 8) | (buf[r + 26] << 16)),
      height: 1 + (buf[r + 27] | (buf[r + 28] << 8) | (buf[r + 29] << 16)),
    };
  // Large pictures are recompressed to JPEG by the existing upload step; read its frame header.
  const j = buf.indexOf(Buffer.from([0xff, 0xd8, 0xff]));
  if (j < 0) return null;
  for (let k = j + 2; k < buf.length - 9; k++) {
    if (buf[k] === 0xff && (buf[k + 1] === 0xc0 || buf[k + 1] === 0xc2))
      return {
        type: "jpeg",
        height: buf.readUInt16BE(k + 5),
        width: buf.readUInt16BE(k + 7),
      };
  }
  return null;
}
const input = p.locator('input[aria-label="Choose a picture"]');
async function tryFile(file) {
  captured = [];
  await input.setInputFiles(file);
  await p.waitForTimeout(3500);
  const status = await p.getByRole("status").allInnerTexts();
  return {
    dims: captured[0] ? png(captured[0]) : null,
    status: status.join(" | "),
  };
}
let r = await tryFile("/tmp/imp/logo.svg");
check(
  "RD-B4-svg",
  "SVG becomes a flat PNG and uploads",
  r.dims &&
    r.dims.width === 800 &&
    r.dims.height === 400 &&
    /SVG is in as a flat picture/.test(r.status),
  JSON.stringify(r)
);
r = await tryFile("/tmp/imp/card.pdf");
check(
  "RD-B4-pdf",
  "PDF page 1 becomes a picture with the page's proportions",
  r.dims &&
    Math.abs(r.dims.width / r.dims.height - 414 / 558) < 0.01 &&
    /Page 1 of your file/.test(r.status),
  JSON.stringify(r)
);
r = await tryFile("/tmp/imp/card.ai");
check(
  "RD-B4-ai",
  ".ai (PDF-compatible) is read through the PDF reader",
  r.dims && Math.abs(r.dims.width / r.dims.height - 414 / 558) < 0.01,
  JSON.stringify(r)
);
r = await tryFile("/tmp/imp/card.psd");
check(
  "RD-B4-psd",
  "PSD flattened preview becomes a 300x200 PNG",
  r.dims &&
    r.dims.width === 300 &&
    r.dims.height === 200 &&
    /Photoshop file is in as one flat picture/.test(r.status),
  JSON.stringify(r)
);
r = await tryFile("/tmp/imp/notes.docx");
check(
  "RD-B4-bad",
  "Unsupported file gets a clear message and no upload",
  !r.dims && /Please choose a PNG, JPG, WebP, SVG, PDF/.test(r.status),
  JSON.stringify(r)
);
await p.screenshot({ path: "/tmp/import.png" });
const real = errs.filter((e) => !/Hydration failed/.test(e));
check(
  "RD-ERR",
  "No page errors",
  real.length === 0,
  real.join(";").slice(0, 300)
);
writeFileSync(
  process.argv[2] ?? "/tmp/batch26.json",
  JSON.stringify(results, null, 2)
);
await b.close();
