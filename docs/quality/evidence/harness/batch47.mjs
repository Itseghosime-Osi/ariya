import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;
const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", id, name, detail);
};
const URL = "http://localhost:3000/documentation/zz-fixture?mode=pro";
const EXPECT = [
  ["Move & Select", "Canvas size & ratio"],
  ["Type text"],
  [
    "Cathedral Arch",
    "Vector Shapes & Geometry",
    "Gradient Fill",
    "Eyedropper sampler",
  ],
  ["Place image / photo", "Import external design"],
  ["Add monogram seal", "Add guest pass seal"],
  ["Hand / Pan", "Zoom Tool"],
];
for (const [w, h, touch] of [
  [1440, 900, false],
  [1440, 1000, false],
  [390, 844, true],
]) {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const p = await (
    await b.newContext({
      viewport: { width: w, height: h },
      hasTouch: touch,
      isMobile: touch,
    })
  ).newPage();
  await p.goto(URL);
  await p
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]")
    .waitFor();
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const tb = document.querySelector(
      '[role="toolbar"][aria-label="Design tools"]'
    );
    const groups = [[]];
    [...tb.children].forEach((c) => {
      const sep =
        c.getAttribute("aria-hidden") === "true" &&
        c.tagName === "SPAN" &&
        !c.querySelector("button");
      if (sep) {
        groups.push([]);
        return;
      }
      const btn = c.matches("button") ? c : c.querySelector("button");
      if (
        btn &&
        btn.getAttribute("aria-label") &&
        btn.getBoundingClientRect().width > 0
      )
        groups[groups.length - 1].push(
          btn
            .getAttribute("aria-label")
            .replace("Guest pass seal added", "Add guest pass seal")
        );
    });
    return groups;
  });
  check(
    `RD-K3-${w}x${h}`,
    "The rail has the six groups in order, one divider between each",
    JSON.stringify(r) ===
      JSON.stringify(
        touch
          ? EXPECT.map((g, i) => (i === 5 ? [...g, "Default colours"] : g))
          : EXPECT
      ),
    JSON.stringify(r)
  );
  if (!touch) {
    const fit = await p.evaluate(() => {
      const t = document.querySelector(
        '[role="toolbar"][aria-label="Design tools"]'
      );
      let e = t.parentElement;
      const sw = [...document.querySelectorAll("button")]
        .filter(
          (x) =>
            x.getAttribute("aria-label") === "Swap colours" &&
            x.getBoundingClientRect().width > 0
        )
        .pop();
      return {
        swapBottom: Math.round(sw.getBoundingClientRect().bottom),
        statusTop: Math.round(
          document
            .querySelector('[data-testid="studio-statusbar"]')
            .getBoundingClientRect().top
        ),
      };
    });
    check(
      `RD-K3-fit-${w}x${h}`,
      "The colour buttons are on screen without scrolling the rail",
      fit.swapBottom <= fit.statusTop + 1,
      JSON.stringify(fit)
    );
  }
  // K2
  const hdr = await p.evaluate(() => {
    const header = document.querySelector('[data-testid="studio-top-header"]');
    const names = [...header.querySelectorAll("a,button")]
      .filter((e) => e.getBoundingClientRect().width > 0)
      .map((e) => e.getAttribute("aria-label") || e.textContent.trim());
    return {
      names,
      over: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
  check(
    `RD-K2a-${w}x${h}`,
    "The header has no separate Help button",
    !hdr.names.includes("Help and shortcuts") && !hdr.over,
    JSON.stringify(hdr.names)
  );
  const themeI = hdr.names.findIndex((n) => /Switch to the/.test(n)),
    modeI = hdr.names.findIndex((n) => n === "Simple");
  check(
    `RD-K2b-${w}x${h}`,
    "Order: back, menus, then theme, Simple/Pro, logo",
    hdr.names[0] === "Back to invitations" &&
      themeI > -1 &&
      themeI < modeI &&
      /^(Àríyá home|Pro)$/.test(hdr.names.at(-1)),
    hdr.names.join(" | ")
  );
  if (w === 1440 && h === 900) {
    await p.mouse.click(700, 120);
    await p.keyboard.press("?");
    check(
      "RD-K2c",
      "The ? key still opens Help",
      (await p
        .getByTestId("studio-help")
        .isVisible()
        .catch(() => false)) ||
        (await p
          .getByTestId("studio-help")
          .waitFor({ timeout: 3000 })
          .then(() => true)
          .catch(() => false))
    );
    await p.keyboard.press("Escape");
    await p.waitForTimeout(300);
    await p.getByRole("button", { name: "Help", exact: true }).click();
    await p.getByRole("menuitem", { name: /Help and shortcuts/ }).click();
    check(
      "RD-K2d",
      "Help menu > Help and shortcuts opens Help",
      await p
        .getByTestId("studio-help")
        .waitFor({ timeout: 3000 })
        .then(() => true)
        .catch(() => false)
    );
  }
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch47.json",
  JSON.stringify(results, null, 2)
);
