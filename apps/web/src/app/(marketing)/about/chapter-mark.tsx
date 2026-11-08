import { CHAPTERS, countdownLabel } from "./chapters";

/** A quiet card between scenes: the chapter number, its name and how far off the wedding is. */
export function ChapterMark({ index }: { index: number }) {
  const c = CHAPTERS[index];
  return (
    <div className="chapter-mark reveal" aria-hidden="true">
      <span className="cm-line" />
      <span className="cm-n">Chapter {c.n}</span>
      <b>{c.title}</b>
      <span className="cm-days">{countdownLabel(c.day)}</span>
      <span className="cm-line" />
    </div>
  );
}
