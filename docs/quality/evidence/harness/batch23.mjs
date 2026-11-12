import { open, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const PRESETS = [
  /^The Cathedral Arch/,
  /^Royal Monogram/,
  /^Modern Minimalist/,
  /^Owambe Opulence/,
];
const LONG = {
  names:
    "Ọlábísí Adébáyọ̀ Ṣeun-Oluwatóbilọ́ba & Chukwuemeka Nnamdi Ògúnlẹ́yẹ-Okonkwo",
  venue:
    "Ààfin Ọba Ọlọ́run Ọlọ́látìlẹ̀ Ìgbàlódé Event Centre, Adéṣọlá Street, Victoria Island, Lagos",
  message:
    "Together with their beloved families, Ọlábísí and Chukwuemeka joyfully invite you to celebrate their marriage, with prayers, dancing, ẹ̀bùn and good food",
};
async function textLayers() {
  return p.$$eval("[data-invitation-canvas] [data-layer-id]", (els) =>
    els
      .filter(
        (e) =>
          (e.textContent || "").trim().length > 2 &&
          !e.querySelector("svg,canvas,img")
      )
      .map((e) => {
        const r = e.getBoundingClientRect();
        return {
          id: e.getAttribute("data-layer-id"),
          t: (e.textContent || "").trim().slice(0, 40),
          l: r.left,
          r: r.right,
          top: r.top,
          bot: r.bottom,
        };
      })
  );
}
async function setText(match, text) {
  const layer = (await textLayers()).find((l) => match.test(l.t));
  if (!layer) return false;
  await p.mouse.click((layer.l + layer.r) / 2, (layer.top + layer.bot) / 2);
  await p.waitForTimeout(250);
  const tb = p.getByRole("textbox", { name: "Text", exact: true });
  if (!(await tb.count())) return false;
  await tb.fill(text);
  await p.waitForTimeout(250);
  return true;
}
for (const preset of PRESETS) {
  const name = String(preset).replace(/\//g, "");
  await p.mouse.click(700, 140); // deselect
  const btn = p.getByRole("button", { name: preset }).first();
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await p.waitForTimeout(700);
  await setText(/&/, LONG.names);
  await setText(/Lagos|Centre/, LONG.venue);
  await setText(/^request|honour|pleasure of your/i, LONG.message);
  await p.keyboard.press("Escape");
  await p.mouse.click(700, 140);
  await p.waitForTimeout(500);
  const card = await p.locator("[data-invitation-canvas]").boundingBox();
  const L = await textLayers();
  const outside = L.filter(
    (l) =>
      l.l < card.x - 1 ||
      l.r > card.x + card.width + 1 ||
      l.top < card.y - 1 ||
      l.bot > card.y + card.height + 1
  );
  const overlaps = [];
  for (let i = 0; i < L.length; i++)
    for (let j = i + 1; j < L.length; j++) {
      const a = L[i],
        c = L[j];
      const ox = Math.min(a.r, c.r) - Math.max(a.l, c.l),
        oy = Math.min(a.bot, c.bot) - Math.max(a.top, c.top);
      if (ox > 2 && oy > 4)
        overlaps.push(`${a.t.slice(0, 14)}|${c.t.slice(0, 14)}`);
    }
  await p.screenshot({ path: `/tmp/tpl-${name.replace(/\W+/g, "")}.png` });
  check(
    `RD-G1-${name}`,
    `${name}: long names/venue/message stay inside the card and do not overlap`,
    outside.length === 0 && overlaps.length === 0,
    `texts=${L.length} outside=${outside.map((o) => o.t.slice(0, 14)).join(",")} overlaps=${overlaps.join(";")}`
  );
}
check(
  "RD-ERR",
  "No page errors",
  errs.length === 0,
  errs.join(";").slice(0, 200)
);
writeFileSync(
  process.argv[2] ?? "/tmp/batch23.json",
  JSON.stringify(results, null, 2)
);
await b.close();
