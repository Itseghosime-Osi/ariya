import { open, layers, centre } from "./lib.mjs";
const tag = process.argv[2];
for (const [name, vp, touch, mode] of [
  ["d", { width: 1440, height: 900 }, false, "pro"],
  ["p", { width: 360, height: 740 }, true, "simple"],
]) {
  for (const dark of [false, true]) {
    const { b, p } = await open({ viewport: vp, touch, mode });
    if (dark) {
      await p.evaluate(() => localStorage.setItem("ariya:studio-dark", "1"));
    }
    const t = p.getByRole("button", { name: /Switch to the dark interface/ });
    if (dark && (await t.count())) {
      await t.click();
      await p.waitForTimeout(900);
    }
    const n = (await layers(p)).find((l) => l.id === "names");
    await p.mouse.click(centre(n).x, centre(n).y);
    await p.waitForTimeout(600);
    await p.screenshot({
      path: `/tmp/tok-${tag}-${name}${dark ? "-dark" : ""}.png`,
    });
    await b.close();
  }
}
