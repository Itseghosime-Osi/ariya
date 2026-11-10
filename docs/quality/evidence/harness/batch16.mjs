import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const dir = process.argv[3];
mkdirSync(dir, { recursive: true });
const { b, p, errs } = await open();
const card = await p.locator("[data-invitation-canvas]").boundingBox();
const exportPng = async (name) => {
  await p.getByRole("button", { name: "Export", exact: true }).click();
  await p
    .getByRole("button")
    .filter({ hasText: "High-Resolution PNG" })
    .click();
  const dl = p.waitForEvent("download", { timeout: 60000 });
  await p.getByRole("button", { name: "Download PNG", exact: true }).click();
  const d = await dl;
  await d.saveAs(`${dir}/${name}.png`);
  await p.waitForTimeout(500);
  if (await p.getByRole("dialog").count()) await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
};
// draw a rounded rectangle with a known fill, soft shadow and outline
await p.keyboard.press("r");
await p.mouse.move(card.x + 80, card.y + 520);
await p.mouse.down();
await p.mouse.move(card.x + 300, card.y + 640, { steps: 6 });
await p.mouse.up();
await p.waitForTimeout(250);
await p.getByLabel("Corner radius", { exact: true }).first().fill("12");
await p.getByLabel("Corner radius", { exact: true }).first().blur();
await p.getByLabel("Fill colour hex code").first().fill("#8a6bb8");
await p.keyboard.press("Enter");
await p.waitForTimeout(300);
await p.mouse.click(card.x + 30, card.y + 480);
await p.waitForTimeout(250);
const r = (await layers(p)).find((l) => l.id.startsWith("shape-"));
await exportPng("plain");
// export again with the Canvas (crop) tool active: overlay must stay out of the file
await p.keyboard.press("c");
await p.waitForTimeout(300);
await exportPng("with-crop-tool");
await p.keyboard.press("v");
writeFileSync(`${dir}/geom.json`, JSON.stringify({ card, r }));
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
await b.close();
