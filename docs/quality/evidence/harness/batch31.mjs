import { open, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
let attempts = 0;
await p.route("**/invitations/upload", async (route) => {
  attempts++;
  if (attempts === 1)
    return route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: "The picture service is busy.",
      }),
    });
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      url: "http://localhost:3000/icons/icon-maskable-512.png",
    }),
  });
});
const before = (await p.$$("[data-invitation-canvas] [data-layer-id]")).length;
await p
  .locator('input[aria-label="Choose a picture"]')
  .setInputFiles("/tmp/imp/logo.svg");
const retry = p.getByRole("button", { name: "Try again" });
await retry.waitFor({ timeout: 8000 });
const msg = await p.getByRole("status").filter({ hasText: "busy" }).innerText();
check(
  "RD-F2a",
  "A failed upload shows its reason and a Try again button",
  /busy/.test(msg),
  msg
);
await retry.click();
await p.waitForTimeout(3000);
const after = (await p.$$("[data-invitation-canvas] [data-layer-id]")).length;
check(
  "RD-F2b",
  "Try again uploads the same file and adds the picture",
  attempts === 2 && after === before + 1,
  `attempts=${attempts} layers ${before}->${after}`
);
check(
  "RD-F2c",
  "The error is gone after success",
  (await p.getByRole("button", { name: "Try again" }).count()) === 0
);
const real = errs.filter((e) => !/Hydration failed/.test(e));
check(
  "RD-ERR",
  "No page errors",
  real.length === 0,
  real.join(";").slice(0, 200)
);
writeFileSync(
  process.argv[2] ?? "/tmp/batch31.json",
  JSON.stringify(results, null, 2)
);
await b.close();
