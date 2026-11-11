import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const pal = p.getByTestId("command-palette");

// D4 command palette
await p.mouse.click(700, 120);
await p.keyboard.press("Control+k");
await pal.waitFor();
await p.keyboard.type("export");
const opts = await p.getByRole("option").allInnerTexts();
check(
  "RD-D4a",
  "Palette filters by word",
  opts.length >= 1 && opts.every((o) => /export/i.test(o)),
  opts.join(" | ")
);
await p.keyboard.press("Enter");
await p.getByTestId("export-summary").waitFor({ timeout: 3000 });
check("RD-D4b", "Enter runs the command (opens Export)", true);
await p.keyboard.press("Escape");
await p.waitForTimeout(400);
await p.mouse.click(700, 120);
await p.keyboard.press("Control+k");
await pal.waitFor();
await p.keyboard.type("zzzzqq");
check(
  "RD-D4c",
  "No-match message shown",
  /Nothing matches/.test(await pal.innerText())
);
await p.keyboard.press("Escape");
await p.waitForTimeout(300);
await p.mouse.click(700, 120);
await p.keyboard.press("Control+k");
await pal.waitFor();
await p.keyboard.type("align left");
await p.screenshot({ path: "/tmp/palette.png" });
await p.keyboard.press("Escape");
await p.waitForTimeout(300);

// D2 quick tour (opened from the palette because automated browsers skip the auto-show)
check(
  "RD-D2a",
  "Tour does not auto-open in automated browsers",
  (await p.getByTestId("quick-tour").count()) === 0
);
await p.mouse.click(700, 120);
await p.keyboard.press("Control+k");
await pal.waitFor();
await p.keyboard.type("quick tour");
await p.keyboard.press("Enter");
const tour = p.getByTestId("quick-tour");
await tour.waitFor();
check(
  "RD-D2b",
  "Tour opens on step 1 of 4",
  /1\. Edit the words/.test(await tour.innerText()) &&
    /1 of 4/.test(await tour.innerText())
);
await p.screenshot({ path: "/tmp/tour.png" });
for (let i = 0; i < 3; i++)
  await tour.getByRole("button", { name: "Next" }).click();
check(
  "RD-D2c",
  "Step 4 shows Done",
  (await tour.getByRole("button", { name: "Done" }).count()) === 1
);
await tour.getByRole("button", { name: "Done" }).click();
await p.waitForTimeout(300);
check(
  "RD-D2d",
  "Done closes the tour and stores the choice",
  (await tour.count()) === 0 &&
    (await p.evaluate(() => localStorage.getItem("ariya:studio-tour-done"))) ===
      "1"
);
const tb = await (async () => {
  await p.keyboard.press("Control+k");
  return null;
})();
await p.keyboard.press("Escape");

// G1/H1 long names with diacritics
const n = (await layers(p)).find((l) => l.id === "names");
const c = centre(n);
await p.mouse.click(c.x, c.y);
await p.waitForTimeout(300);
const long =
  "Ọlábísí Adébáyọ̀ Ṣeun-Oluwatóbilọ́ba & Chukwuemeka Nnamdi Ògúnlẹ́yẹ-Okonkwo";
await p.getByRole("textbox", { name: "Text", exact: true }).fill(long);
await p.waitForTimeout(500);
const geo = await p.evaluate(() => {
  const card = document
    .querySelector("[data-invitation-canvas]")
    .getBoundingClientRect();
  const el = document.querySelector(
    '[data-invitation-canvas] [data-layer-id="names"]'
  );
  const r = el.getBoundingClientRect();
  return {
    card: [card.left, card.right, card.top, card.bottom],
    el: [r.left, r.right, r.top, r.bottom],
    text: el.textContent,
    sw: el.scrollWidth,
    cw: el.clientWidth,
  };
});
const msg = await p.evaluate(
  () =>
    document
      .querySelector('[data-invitation-canvas] [data-layer-id="message"]')
      .getBoundingClientRect().top
);
check(
  "RD-G1",
  "Long diacritic names stay inside the card width",
  geo.el[0] >= geo.card[0] - 1 &&
    geo.el[1] <= geo.card[1] + 1 &&
    geo.text.includes("Ọlábísí"),
  JSON.stringify(geo.el)
);
check(
  "RD-G1b",
  "KNOWN DEFECT: very long names must not overlap the next line of text",
  geo.el[3] <= msg + 1,
  `names bottom=${geo.el[3].toFixed(0)} message top=${msg.toFixed(0)}`
);
await p.screenshot({ path: "/tmp/longname.png" });
await p.keyboard.press("Escape");
await p.mouse.click(c.x, c.y - 300);

// E1 stress: grow to 60 layers, then measure frame times while dragging
await p.mouse.click(700, 120);
for (let i = 0; i < 3; i++) {
  await p.keyboard.press("Control+a");
  await p.keyboard.press("Control+j");
  await p.waitForTimeout(300);
}
const count = (await layers(p)).length;
await p.keyboard.press("Escape");
const top = (await layers(p)).find((l) => l.id === "names");
await p.evaluate(() => {
  window.__frames = [];
  let last = performance.now();
  const tick = (t) => {
    window.__frames.push(t - last);
    last = t;
    window.__raf = requestAnimationFrame(tick);
  };
  window.__raf = requestAnimationFrame(tick);
});
const cc = centre(top);
await p.mouse.move(cc.x, cc.y);
await p.mouse.down();
for (let i = 0; i < 40; i++) await p.mouse.move(cc.x + i * 3, cc.y + i * 2);
await p.mouse.up();
const frames = await p.evaluate(() => {
  cancelAnimationFrame(window.__raf);
  return window.__frames.slice(2);
});
frames.sort((a, c2) => a - c2);
const p95 = frames[Math.floor(frames.length * 0.95)];
const med = frames[Math.floor(frames.length * 0.5)];
check(
  "RD-E1",
  `Dragging with ${count} layers (headless dev build, no GPU)`,
  count >= 40 && p95 < 100,
  `layers=${count} frames=${frames.length} median=${med.toFixed(1)}ms p95=${p95.toFixed(1)}ms`
);
check(
  "RD-ERR",
  "No page errors",
  errs.length === 0,
  errs.join(";").slice(0, 200)
);
writeFileSync(
  process.argv[2] ?? "/tmp/batch21.json",
  JSON.stringify(results, null, 2)
);
await b.close();
