import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const URL = "http://localhost:3000/documentation/zz-fixture";
async function open(width, height, mode, touch = false) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const ctx = await b.newContext({
    viewport: { width, height },
    hasTouch: touch,
  });
  const p = await ctx.newPage();
  await p.goto(`${URL}?mode=${mode}`);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(800);
  return { b, p };
}

// A2: the header fits on phones
for (const w of [360, 390, 430]) {
  const { b, p } = await open(w, 800, "pro", true);
  const r = await p.evaluate(() => {
    const seg = [
      ...document.querySelectorAll(
        "header [role=radiogroup], header [role=tablist], header div"
      ),
    ].find(
      (e) =>
        /Simple/.test(e.textContent || "") &&
        /Pro/.test(e.textContent || "") &&
        e.children.length >= 2 &&
        e.getBoundingClientRect().width < 200
    );
    const box = seg.getBoundingClientRect();
    const kids = [...seg.querySelectorAll("*")].filter((k) =>
      /^(Simple|Pro)$/.test((k.textContent || "").trim())
    );
    return {
      right: box.right,
      vw: innerWidth,
      kidsRight: Math.max(...kids.map((k) => k.getBoundingClientRect().right)),
      over: seg.scrollWidth > seg.clientWidth + 1,
    };
  });
  check(
    `RD-A2-${w}`,
    `Simple/Pro switch is fully on screen at ${w}px`,
    r.right <= r.vw && r.kidsRight <= r.vw - 4 && !r.over,
    JSON.stringify(r)
  );
  if (w === 390) await p.screenshot({ path: "/tmp/tidy-a2-390.png" });
  await b.close();
}

// A1: zoom menu is not clipped, on desktop and phone
for (const [w, h, touch] of [
  [1440, 900, false],
  [390, 844, true],
]) {
  const { b, p } = await open(w, h, "pro", touch);
  const sel = p.getByTestId("zoom-presets");
  const r = await sel.evaluate((e) => ({
    w: e.getBoundingClientRect().width,
    text: e.options[e.selectedIndex].text,
    sw: e.scrollWidth,
    cw: e.clientWidth,
  }));
  check(
    `RD-A1-${w}`,
    `Zoom menu shows a full chevron, not clipped text (${w}px)`,
    r.text === "▾" && r.w >= 28 && r.sw <= r.cw + 1,
    JSON.stringify(r)
  );
  await sel.selectOption("1");
  await p.waitForTimeout(300);
  check(
    `RD-A1-${w}-works`,
    "Zoom menu still sets the zoom",
    /100%/.test(
      await p.locator("button[aria-label$='reset zoom to fit']").innerText()
    )
  );
  await p.screenshot({ path: `/tmp/tidy-a1-${w}.png` });
  await b.close();
}

// A3: the options row shows its scroll edge on a phone
{
  const { b, p } = await open(390, 844, "pro", true);
  const n = await p.evaluate(() =>
    [...document.querySelectorAll("[data-invitation-canvas] [data-layer-id]")]
      .find((e) => e.getAttribute("data-layer-id") === "names")
      .getBoundingClientRect()
      .toJSON()
  );
  await p.mouse.click(n.x + n.width / 2, n.y + n.height / 2);
  await p.waitForTimeout(500);
  const r = await p
    .getByRole("toolbar", { name: "Contextual Tool Options" })
    .evaluate((e) => {
      const cs = getComputedStyle(e);
      return {
        scrolls: e.scrollWidth > e.clientWidth + 1,
        attach: cs.backgroundAttachment,
        layers: cs.backgroundImage.split("gradient").length - 1,
      };
    });
  check(
    "RD-A3",
    "Options row scrolls on a phone and has scroll-edge shading",
    r.scrolls && /local/.test(r.attach) && r.layers >= 4,
    JSON.stringify(r)
  );
  await p.screenshot({ path: "/tmp/tidy-a3-390.png" });
  await b.close();
}

// A4: rulers follow the mode until the host chooses
{
  const { b, p } = await open(1440, 900, "simple");
  const rulers = async () =>
    (await p
      .locator(
        '[data-testid="ruler-x"], [data-testid="ruler-horizontal"], [aria-label*="ruler" i]'
      )
      .count()) > 0;
  const simpleHasRulers = await p.evaluate(
    () =>
      /px/.test(
        document.querySelector("[data-testid=designer-stage]")?.parentElement
          ?.textContent || ""
      ) && !!document.querySelector("canvas, [class*=ruler]")
  );
  // fall back to the View menu label, which reads "Show Rulers" when they are off
  await p.getByRole("button", { name: "View" }).click();
  const label = await p
    .getByRole("menuitem", { name: /Rulers/ })
    .first()
    .innerText();
  check(
    "RD-A4a",
    "Simple mode starts with rulers off",
    /Show Rulers/.test(label),
    label
  );
  await p
    .getByRole("menuitem", { name: /Rulers/ })
    .first()
    .click();
  await p.waitForTimeout(300);
  await p.getByRole("button", { name: "View" }).click();
  const label2 = await p
    .getByRole("menuitem", { name: /Rulers/ })
    .first()
    .innerText();
  check(
    "RD-A4b",
    "The host can turn rulers on in Simple mode",
    /Hide Rulers/.test(label2),
    label2
  );
  await p.keyboard.press("Escape");
  await b.close();
  const pro = await open(1440, 900, "pro");
  await pro.p.getByRole("button", { name: "View" }).click();
  const label3 = await pro.p
    .getByRole("menuitem", { name: /Rulers/ })
    .first()
    .innerText();
  check(
    "RD-A4c",
    "Pro mode still starts with rulers on",
    /Hide Rulers/.test(label3),
    label3
  );
  await pro.b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch34.json",
  JSON.stringify(results, null, 2)
);
