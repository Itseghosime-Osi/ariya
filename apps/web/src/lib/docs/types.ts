/**
 * The manual is plain data: pages made of blocks. Text may carry `code`, **bold** and
 * [links](/path); nothing else, so a page can never inject markup.
 */
export type Block =
  | { t: "h2"; x: string }
  | { t: "h3"; x: string }
  | { t: "p"; x: string }
  | { t: "ul"; x: string[] }
  | { t: "ol"; x: string[] }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "note"; tone?: "info" | "tip" | "warn"; title?: string; x: string }
  | { t: "code"; x: string; lang?: string };

export type DocGroupId =
  "start" | "hosts" | "admin" | "engineering" | "reference";

export interface DocPage {
  slug: string;
  title: string;
  group: DocGroupId;
  /** One sentence shown under the title, on cards and in search. */
  summary: string;
  /** Who the page is for. */
  audience: string;
  blocks: Block[];
}

export interface DocGroup {
  id: DocGroupId;
  title: string;
  blurb: string;
}
