import type { StoryChapter } from "./story";

/** A quiet card between scenes: the chapter number, its name and a short note. */
export function ChapterMark({ chapter }: { chapter: StoryChapter }) {
  return (
    <div className="chapter-mark reveal" aria-hidden="true">
      <span className="cm-line" />
      <span className="cm-n">Chapter {chapter.n}</span>
      <b>{chapter.title}</b>
      {chapter.note && <span className="cm-days">{chapter.note}</span>}
      <span className="cm-line" />
    </div>
  );
}
