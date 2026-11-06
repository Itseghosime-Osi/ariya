import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { CateringReport } from "@ariya/studio";
import { perHead } from "./catering";

/**
 * The shopping list as a PDF, laid out to match the panel: the same groups in the same order, the
 * same Low / Likely / High columns, the same caveat at the foot.
 *
 * A caterer gets a sheet they can print and tick off, which is the point of 4.3.2 — so this is a
 * text document, not a screenshot of the UI, and it carries the derivation basis for every line.
 */

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 48;
const LINE = 13;

/** A number a caterer can read at a glance: no decimals on something you count. */
function quantity(v: number): string {
  return Math.abs(v - Math.round(v)) < 0.05
    ? String(Math.round(v))
    : v.toFixed(1);
}

/** pdf-lib's standard fonts are WinAnsi; anything outside it (the × and § in the notes) would
 * throw at draw time, so the copy is normalised before it reaches the page. */
function latin(s: string): string {
  return s
    .replace(/×/g, "x")
    .replace(/÷/g, "/")
    .replace(/§/g, "s.")
    .replace(/[—–]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/±/g, "+/-")
    .replace(/≈/g, "~");
}

export async function buildCateringPdf(
  report: CateringReport,
  title: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - MARGIN;

  const ink = rgb(0.16, 0.13, 0.12);
  const muted = rgb(0.42, 0.39, 0.36);
  const rule = rgb(0.85, 0.82, 0.78);

  const newPage = () => {
    page = doc.addPage([A4.w, A4.h]);
    y = A4.h - MARGIN;
  };

  const need = (space: number) => {
    if (y - space < MARGIN) newPage();
  };

  const text = (
    s: string,
    opts: {
      size?: number;
      font?: typeof regular;
      colour?: typeof ink;
      x?: number;
      align?: "right";
    } = {}
  ) => {
    const size = opts.size ?? 10;
    const font = opts.font ?? regular;
    const colour = opts.colour ?? ink;
    const body = latin(s);
    const x =
      opts.align === "right"
        ? A4.w - MARGIN - font.widthOfTextAtSize(body, size)
        : (opts.x ?? MARGIN);
    page.drawText(body, { x, y, size, font, color: colour });
  };

  const write = (s: string, opts?: Parameters<typeof text>[1]) => {
    need(LINE);
    text(s, opts);
    y -= LINE;
  };

  // Heading
  text(latin(title), { size: 18, font: bold });
  y -= 26;
  text(
    `Catering for ${report.effectiveGuests} people - ${report.portions} portions with ${Math.round(
      report.overage * 100
    )} % spare`,
    { size: 11, colour: muted }
  );
  y -= 24;

  for (const group of report.groups) {
    need(LINE * 3);
    page.drawLine({
      start: { x: MARGIN, y: y + 4 },
      end: { x: A4.w - MARGIN, y: y + 4 },
      thickness: 0.5,
      color: rule,
    });
    y -= 12;
    text(`BY THE ${group.label.toUpperCase()}`, {
      size: 9,
      font: bold,
      colour: muted,
    });
    y -= LINE + 2;

    for (const line of group.lines) {
      need(LINE * 2);
      text(line.label, { size: 10 });
      text(`${quantity(line.likely)} ${line.unit}`, {
        size: 10,
        font: bold,
        align: "right",
      });
      y -= LINE;
      text(`${quantity(line.low)} - ${quantity(line.high)} ${line.unit}`, {
        size: 8,
        colour: muted,
        align: "right",
      });
      // The per-head figure sits beside the basis, because a host reading the sheet on paper is
      // the one who most needs to know what 160 kg means for a single plate.
      const basis =
        line.perGuest > 0 ? `${line.basis}  .  ~ ${perHead(line)}` : line.basis;
      text(basis, { size: 8, colour: muted, x: MARGIN + 8 });
      y -= LINE;
    }
    y -= 8;
  }

  need(LINE * 6);
  y -= 6;
  page.drawLine({
    start: { x: MARGIN, y: y + 4 },
    end: { x: A4.w - MARGIN, y: y + 4 },
    thickness: 0.5,
    color: rule,
  });
  y -= 14;
  text("How to read this", { size: 9, font: bold, colour: muted });
  y -= LINE + 2;

  for (const note of report.notes) {
    for (const chunk of wrap(latin(note), 9, A4.w - MARGIN * 2)) {
      write(chunk, { size: 9, colour: muted });
    }
  }
  y -= 4;
  for (const chunk of wrap(
    "These are defensible estimates within about +/- 20 %, not a cited standard. Take the Likely column to your caterer and adjust.",
    9,
    A4.w - MARGIN * 2
  )) {
    write(chunk, { size: 9, colour: muted });
  }

  return doc.save();
}

/** Greedy wrap at word boundaries. Helvetica averages about half its point size per character,
 * which is close enough for short notes; this is not a typesetter. */
function wrap(s: string, size: number, width: number): string[] {
  const measure = (t: string) => t.length * size * 0.5;
  const words = s.split(/\s+/);
  const out: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (measure(next) > width && current) {
      out.push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) out.push(current);
  return out;
}

/** Build the list and hand it to the browser as a download. */
export async function downloadCateringList(
  report: CateringReport,
  title = "Catering shopping list"
): Promise<void> {
  const bytes = await buildCateringPdf(report, title);
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "catering-list.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
