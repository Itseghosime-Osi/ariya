import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const QUALITY_DIR = path.resolve(__dirname, "../../../../docs/quality");
export const CHECKLIST = path.join(
  QUALITY_DIR,
  "designer-redesign-checklist.md"
);

export type ChecklistItem = {
  id: string;
  priority: string;
  title: string;
  closed: boolean;
  /** Everything under the item up to the next item or heading. */
  body: string;
  /** The line that gives the evidence, the decision, or the reason it is open. */
  note: string | null;
  /** The date written in that note, if any (YYYY-MM-DD). */
  date: string | null;
};

/** Reads the checklist's items: `- [x] **A1 (P0) Title.** ...` plus its indented lines. */
export function parseChecklist(markdown: string): ChecklistItem[] {
  const lines = markdown.split("\n");
  const items: ChecklistItem[] = [];
  let current: ChecklistItem | null = null;
  for (const line of lines) {
    const head = line.match(
      /^- \[( |x)\] \*\*([A-Z]\d+) \((P\d)\)\s*(.*?)\*\*/
    );
    if (head) {
      current = {
        id: head[2],
        priority: head[3],
        title: head[4].replace(/\.$/, ""),
        closed: head[1] === "x",
        body: line,
        note: null,
        date: null,
      };
      items.push(current);
      continue;
    }
    if (/^(#|- )/.test(line) && !/^\s/.test(line)) {
      current = null;
      continue;
    }
    if (current) {
      current.body += "\n" + line;
      const trimmed = line.trim();
      // "Done when:" only says what would prove the item; the note is what actually does.
      if (
        /^(Evidence|Decision|Fixed|Progress|Open|Not applicable)/i.test(trimmed)
      ) {
        current.note ??= trimmed;
        const date = trimmed.match(/\d{4}-\d{2}-\d{2}/)?.[0];
        // The newest date in the item's notes is when it was last re-evidenced.
        if (date && (!current.date || date > current.date)) current.date = date;
      }
    }
  }
  return items;
}

/** Files in `docs/quality` that an item's text points at, as `evidence/x.json` or `screenshots/y.png`. */
export function referencedFiles(item: ChecklistItem): string[] {
  const found = item.body.match(
    /(?:evidence|screenshots)\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+/g
  );
  return [...new Set(found ?? [])];
}

export function missingFiles(item: ChecklistItem): string[] {
  return referencedFiles(item).filter(
    (f) => !existsSync(path.join(QUALITY_DIR, f))
  );
}

export function loadChecklist(): ChecklistItem[] {
  return parseChecklist(readFileSync(CHECKLIST, "utf8"));
}

/** The "N of M items are closed; K are open" sentence in the close-out summary. */
export function summaryCounts(
  markdown: string
): { closed: number; total: number; open: number } | null {
  const m = markdown.match(
    /(\d+) of (\d+) items are closed[^;]*; (\d+) are open/
  );
  return m ? { closed: +m[1], total: +m[2], open: +m[3] } : null;
}
