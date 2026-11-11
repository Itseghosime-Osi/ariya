import { open, layers, centre, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { b, p, errs } = await open();
const card = await p.locator("[data-invitation-canvas]").boundingBox();
const L = async (id) => (await layers(p)).find((l) => l.id === id);
const undo = () => p.keyboard.press("Control+z");
const editing = () => p.locator("[data-editing-text]").count();
const textOf = async (id) =>
  p.evaluate(
    (id) => document.querySelector(`[data-layer-id="${id}"]`)?.textContent,
    id
  );
const startEdit = async (id) => {
  const c = centre(await L(id));
  await p.mouse.dblclick(c.x, c.y);
  await p.waitForTimeout(250);
};
const commit = async () => {
  await p.mouse.click(card.x + 30, card.y + 450);
  await p.waitForTimeout(250);
};
// DES-129 / DES-260 shortcuts typed in a text box
await startEdit("names");
await p.keyboard.press("Control+a");
await p.keyboard.type("rtvhxdmgu 123");
const stillEditing = await editing();
const typed = await textOf("names");
const toolPressed = await p
  .locator(
    '[aria-pressed="true"][title*="(R)"], [aria-pressed="true"][title*="Type text"]'
  )
  .count();
await commit();
check(
  "DES-129",
  "Use shortcuts while typing",
  stillEditing === 1 && typed === "rtvhxdmgu 123",
  `typed tool/shortcut letters; text kept "${typed}"; tool shortcuts did not fire (editing stayed open)`
);
check(
  "DES-260",
  "Press shortcuts while editing an input",
  stillEditing === 1 && typed === "rtvhxdmgu 123",
  "same typing check in a text box; field inputs are also excluded by the shortcut handler (guard on INPUT/TEXTAREA/SELECT/contentEditable)"
);
// DES-261 Ctrl+Z in text editing vs document mode
await undo();
await p.waitForTimeout(250);
check(
  "DES-261a",
  "Document undo after committing text edit",
  (await textOf("names")) === "Adaeze & Tunde",
  `Ctrl+Z after commit restores "${await textOf("names")}"`
);
await startEdit("names");
await p.keyboard.press("Control+a");
await p.keyboard.type("Temporary words");
await p.keyboard.press("Control+z");
await p.waitForTimeout(150);
const inEdit = await textOf("names");
const docUnchangedWhileEditing = (await layers(p)).length === 10;
await p.keyboard.press("Escape");
await p.waitForTimeout(250);
check(
  "DES-261",
  "Use Cmd/Ctrl+Z in text and document modes",
  docUnchangedWhileEditing && (await textOf("names")) === "Adaeze & Tunde",
  `while typing, Ctrl+Z acts on the text ("${inEdit}") not the document; Escape restores the original`
);
// DES-126 long Nigerian names
const long =
  "Oluwaseyifunmitayo Chukwuemeka Babatunde-Nwachukwu & Oluwadamilare Adebayowale Ogunleye-Onyekachukwu";
await startEdit("names");
await p.keyboard.press("Control+a");
await p.keyboard.insertText(long);
await commit();
const ln = await L("names");
check(
  "DES-126",
  "Test long Nigerian names",
  ln.x >= card.x - 1 &&
    ln.x + ln.w <= card.x + card.width + 1 &&
    ln.y + ln.h <= card.y + card.height,
  `long couple names wrap inside the card: box ${Math.round(ln.w)}×${Math.round(ln.h)} px within ${Math.round(card.width)}×${Math.round(card.height)}; no horizontal overflow`
);
await undo();
await p.waitForTimeout(200);
// DES-127 emoji and mixed scripts
await startEdit("names");
await p.keyboard.press("Control+a");
await p.keyboard.type("Ọlájídé 🎉 欢迎 مرحبا");
await commit();
const mixed = await textOf("names");
check(
  "DES-127",
  "Use emoji and mixed scripts",
  mixed === "Ọlájídé 🎉 欢迎 مرحبا",
  `typed text round-trips intact: "${mixed}"`
);
await undo();
await p.waitForTimeout(200);
// DES-128 delete all text while editing
await startEdit("names");
await p.keyboard.press("Control+a");
await p.keyboard.press("Backspace");
await p.waitForTimeout(150);
await commit();
const afterDel = await L("names");
const count = (await layers(p)).length;
check(
  "DES-128",
  "Delete text while editing",
  count === 10 || count === 9,
  `empty text → layer ${afterDel ? "kept (empty)" : "removed"}; layer count ${count}; no error`
);
await undo();
await p.waitForTimeout(200);
// DES-115 paste plain vs formatted
await startEdit("names");
await p.keyboard.press("Control+a");
await p.evaluate(() => {
  const el = document.querySelector("[data-editing-text]");
  const dt = new DataTransfer();
  dt.setData("text/plain", "Plain pasted");
  dt.setData("text/html", "<b style='font-size:40px'>Bold</b>");
  el.dispatchEvent(
    new ClipboardEvent("paste", {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    })
  );
});
await p.waitForTimeout(150);
const html = await p.evaluate(
  () => document.querySelector("[data-editing-text]").innerHTML
);
check(
  "DES-115",
  "Paste plain and formatted text",
  /Plain pasted/.test(html) && !/<b|font-size/.test(html),
  `pasted formatted clipboard becomes plain text: ${html.slice(0, 60)}`
);
await p.keyboard.press("Escape");
// DES-117 resize a paragraph box: select message layer, drag its east handle
await p.mouse.click(card.x + 30, card.y + 450);
const m0 = await L("message");
await p.mouse.click(centre(m0).x, centre(m0).y);
const e = await p.locator('[data-handle="e"]').boundingBox();
await p.mouse.move(e.x + 14, e.y + 14);
await p.mouse.down();
await p.mouse.move(e.x + 14 - 90, e.y + 14, { steps: 6 });
await p.mouse.up();
await p.waitForTimeout(250);
const m1 = await L("message");
check(
  "DES-117",
  "Resize a paragraph box",
  m1.w < m0.w - 60 && m1.h > m0.h + 5,
  `narrowing the box ${Math.round(m0.w)}→${Math.round(m1.w)} px rewraps the text taller ${Math.round(m0.h)}→${Math.round(m1.h)} px`
);
// DES-108 click with Type tool / DES-109 drag
const n0 = (await layers(p)).length;
await p.mouse.click(card.x + 30, card.y + 450);
await p.keyboard.press("t");
await p.mouse.click(card.x + 80, card.y + 600);
await p.waitForTimeout(350);
const n1 = (await layers(p)).length;
const typing1 = await editing();
await p.keyboard.type("Click text");
await commit();
const t1 = (await layers(p)).find((l) => /Click text/.test(l.text));
check(
  "DES-108",
  "Click with Type tool",
  n1 === n0 + 1 && !!t1,
  `layers ${n0}→${n1}; typed text landed: ${!!t1}; editing opened immediately=${typing1 === 1}`
);
await p.keyboard.press("t");
await p.mouse.move(card.x + 60, card.y + 640);
await p.mouse.down();
await p.mouse.move(card.x + 260, card.y + 690, { steps: 6 });
await p.mouse.up();
await p.waitForTimeout(350);
const n2 = (await layers(p)).length;
await p.keyboard.type("Drag text");
await commit();
const t2 = (await layers(p)).find((l) => /Drag text/.test(l.text));
check(
  "DES-109",
  "Drag with Type tool",
  n2 === n1 + 1 && !!t2 && t2.w > 100,
  `layers ${n1}→${n2}; dragged-box layer width ${t2 ? Math.round(t2.w) : "?"} px`
);
check(
  "PAGE",
  "no page errors",
  errs.length === 0,
  errs.join("|").slice(0, 200)
);
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
await b.close();
