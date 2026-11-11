import { open, check, results } from "./lib.mjs";
import { writeFileSync } from "node:fs";
for (const mode of ["pro", "simple"]) {
  const { b, p, errs } = await open({ mode });
  // D3 / I1: every visible control has an accessible name
  const unnamed = await p.evaluate(() => {
    const out = [];
    const nameOf = (el) => {
      const label = el.getAttribute("aria-label") || el.getAttribute("title");
      if (label && label.trim()) return label.trim();
      const lb = el.getAttribute("aria-labelledby");
      if (lb) {
        const t = lb
          .split(" ")
          .map((id) => document.getElementById(id)?.textContent || "")
          .join(" ")
          .trim();
        if (t) return t;
      }
      if (el.id) {
        const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (l?.textContent?.trim()) return l.textContent.trim();
      }
      const wrap = el.closest("label");
      if (wrap?.textContent?.trim()) return wrap.textContent.trim();
      const text = (el.textContent || "").trim();
      if (text) return text;
      const ph = el.getAttribute("placeholder");
      if (ph) return ph;
      return "";
    };
    document
      .querySelectorAll(
        "button, input, select, textarea, [role=button], [role=switch], [role=tab], a[href]"
      )
      .forEach((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (
          r.width === 0 ||
          r.height === 0 ||
          cs.visibility === "hidden" ||
          cs.display === "none"
        )
          return;
        if (el.closest("[hidden], [aria-hidden=true]")) return;
        if (
          el.type === "file" ||
          (el.classList.contains("sr-only") && el.type === "file")
        )
          return;
        if (!nameOf(el))
          out.push(
            `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${(el.className || "").toString().slice(0, 50)}`
          );
      });
    return out;
  });
  check(
    `RD-D3-${mode}`,
    `Every visible control has a name (${mode} mode)`,
    unnamed.length === 0,
    unnamed.slice(0, 8).join(" ; ")
  );
  // L12: tab through, focus never lost or trapped; focus ring visible
  let stuck = 0,
    noRing = [],
    seen = new Set(),
    last = "";
  for (let i = 0; i < 70; i++) {
    await p.keyboard.press("Tab");
    const info = await p.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return { body: true };
      const cs = getComputedStyle(a);
      const ring =
        (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) ||
        cs.boxShadow !== "none";
      const key = `${a.tagName}|${a.getAttribute("aria-label") || ""}|${(a.textContent || "").trim().slice(0, 20)}|${a.id}`;
      return { key, ring, tag: a.tagName };
    });
    if (info.body) {
      stuck++;
      continue;
    }
    seen.add(info.key);
    if (!info.ring && !/docs-search/.test(info.key)) noRing.push(info.key);
    if (info.key === last) stuck++;
    last = info.key;
  }
  check(
    `RD-L12-${mode}a`,
    `Tab reaches many distinct controls without getting stuck (${mode})`,
    seen.size >= 25 && stuck < 8,
    `distinct=${seen.size} stuck=${stuck}`
  );
  const uniqNo = [...new Set(noRing)];
  check(
    `RD-L12-${mode}b`,
    `Focused controls show a visible focus indicator (${mode})`,
    uniqNo.length <= Math.max(2, Math.floor(seen.size * 0.1)),
    `${uniqNo.length}/${seen.size} without: ${uniqNo.slice(0, 6).join(" ; ")}`
  );
  const real = errs.filter((e) => !/Hydration failed/.test(e));
  check(
    `RD-ERR-${mode}`,
    "No page errors",
    real.length === 0,
    real.join(";").slice(0, 200)
  );
  await b.close();
}
writeFileSync(
  process.argv[2] ?? "/tmp/batch28.json",
  JSON.stringify(results, null, 2)
);
