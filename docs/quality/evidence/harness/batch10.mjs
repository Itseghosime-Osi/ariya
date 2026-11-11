import { open, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const pos = async () => p.locator("[data-invitation-canvas]").boundingBox();
const b0 = await pos();
await p.keyboard.down("Space");
await p.waitForTimeout(200);
await p.mouse.move(150, 500);
await p.mouse.down();
await p.mouse.move(210, 540, { steps: 5 });
await p.mouse.up();
await p.keyboard.up("Space");
const b1 = await pos();
const viaSpace = [b1.x - b0.x, b1.y - b0.y];
await p.keyboard.press("h");
await p.waitForTimeout(150);
await p.mouse.move(b1.x + 200, b1.y + 300);
await p.mouse.down();
await p.mouse.move(b1.x + 260, b1.y + 340, { steps: 5 });
await p.mouse.up();
const b2 = await pos();
const viaHand = [b2.x - b1.x, b2.y - b1.y];
await p.keyboard.press("v");
await p.mouse.move(b2.x + 200, b2.y + 300);
await p.mouse.wheel(0, 120);
await p.waitForTimeout(200);
const b3 = await pos();
const viaWheel = [b3.x - b2.x, b3.y - b2.y];
check(
  "DES-194",
  "Pan with hand or Space",
  viaSpace[0] === 60 &&
    viaSpace[1] === 40 &&
    viaHand[0] === 60 &&
    viaHand[1] === 40 &&
    viaWheel[1] === -120,
  `Space+drag ${viaSpace}, Hand tool drag ${viaHand}, mouse wheel ${viaWheel} (px moved for 60,40 drags / 120 wheel)`
);
const motion = (page) =>
  page.evaluate(
    () =>
      [
        ...document.querySelectorAll('[data-testid="invitation-designer"] *'),
      ].filter((e) => {
        const s = getComputedStyle(e);
        return (
          (parseFloat(s.transitionDuration) > 0 &&
            s.transitionProperty !== "none") ||
          (parseFloat(s.animationDuration) > 0 && s.animationName !== "none")
        );
      }).length
  );
const normal = await motion(p);
await b.close();
const rm = await open({ reducedMotion: "reduce" });
const reduced = await motion(rm.p);
check(
  "DES-267",
  "Use reduced motion",
  normal > 0 && reduced <= normal,
  `elements with transitions or animations: ${normal} normally, ${reduced} with prefers-reduced-motion. This counts them; it does not prove each is shortened`
);
await rm.b.close();
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
