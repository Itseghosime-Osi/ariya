import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { tableTop, type HallLayout } from "./model";

/**
 * A measured floor plan for the venue manager and the caterer: the room to scale with its size on
 * two sides, every area with its size, every table with its name and seats, and a 5 m scale bar.
 * Drawn from the same hall document the studio saves, from above, so it can be printed and
 * measured with a ruler. No guest names: a plan shared with a venue does not need them.
 */
export interface PlanTable {
  name: string;
  shape: string;
  capacity: number;
  /** Centre in metres from the top-left corner of the hall. */
  x: number;
  y: number;
  /** Degrees. */
  rot: number;
  /** People seated now, when known. */
  seated?: number;
}

const INK = rgb(0.11, 0.06, 0.08);
const SOFT = rgb(0.35, 0.28, 0.3);
const BURGUNDY = rgb(0.42, 0.12, 0.18);
const GOLD = rgb(0.72, 0.53, 0.29);
const LINEN = rgb(0.98, 0.96, 0.93);

/** pdf-lib's standard fonts are WinAnsi: anything outside it is reduced to its base letter. */
export function winAnsi(s: string): string {
  const swapped = s
    .replace(/×/g, "x")
    .replace(/[—–]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...");
  let out = "";
  for (const ch of swapped) {
    if (ch.charCodeAt(0) <= 0xff) out += ch;
    else {
      const base = ch.normalize("NFD")[0];
      out += base && base.charCodeAt(0) <= 0xff ? base : "?";
    }
  }
  return out;
}

function metres(v: number) {
  return `${Math.round(v * 10) / 10} m`;
}

function label(
  page: PDFPage,
  font: PDFFont,
  text: string,
  cx: number,
  cy: number,
  size: number,
  color = INK
) {
  const t = winAnsi(text);
  const w = font.widthOfTextAtSize(t, size);
  page.drawText(t, { x: cx - w / 2, y: cy - size / 2.8, size, font, color });
}

export async function buildFloorPlanPdf(input: {
  title: string;
  subtitle?: string;
  layout: HallLayout;
  tables: PlanTable[];
}): Promise<Uint8Array> {
  const { layout, tables } = input;
  const doc = await PDFDocument.create();
  doc.setTitle(winAnsi(`${input.title} - floor plan`));
  doc.setCreator("Ariya");
  const page = doc.addPage([842, 595]); // A4 landscape, points
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Header.
  page.drawText(winAnsi(input.title), {
    x: 40,
    y: 556,
    size: 16,
    font: bold,
    color: INK,
  });
  page.drawText(
    winAnsi(
      [
        input.subtitle,
        `Hall ${layout.width} x ${layout.length} m`,
        `${tables.length} tables`,
      ]
        .filter(Boolean)
        .join("  |  ")
    ),
    { x: 40, y: 538, size: 9, font: regular, color: SOFT }
  );

  // The room to scale, centred in the space left under the header and above the footer.
  const area = { x: 60, y: 70, w: 842 - 120, h: 595 - 70 - 90 };
  const scale = Math.min(area.w / layout.width, area.h / layout.length);
  const roomW = layout.width * scale;
  const roomH = layout.length * scale;
  const ox = area.x + (area.w - roomW) / 2;
  const oy = area.y + (area.h - roomH) / 2;
  // Hall metres (from the top-left, y down) to page points (from the bottom-left, y up).
  const px = (x: number) => ox + x * scale;
  const py = (y: number) => oy + roomH - y * scale;

  page.drawRectangle({
    x: ox,
    y: oy,
    width: roomW,
    height: roomH,
    color: LINEN,
    borderColor: INK,
    borderWidth: 1.2,
  });
  label(
    page,
    bold,
    `${metres(layout.width)} wide`,
    ox + roomW / 2,
    oy + roomH + 10,
    9
  );
  page.drawText(winAnsi(`${metres(layout.length)} long`), {
    x: ox - 12,
    y: oy + roomH / 2 - 22,
    size: 9,
    font: bold,
    color: INK,
    rotate: degrees(90),
  });

  // Areas: stage, dance floor, bar, entrance and the rest, each with its size.
  for (const z of layout.zones) {
    const turned = Math.round((((z.rot ?? 0) % 180) + 180) % 180) === 90;
    const w = (turned ? z.h : z.w) * scale;
    const h = (turned ? z.w : z.h) * scale;
    page.drawRectangle({
      x: px(z.x) - w / 2,
      y: py(z.y) - h / 2,
      width: w,
      height: h,
      color: rgb(0.93, 0.89, 0.84),
      borderColor: GOLD,
      borderWidth: 0.8,
    });
    label(page, bold, z.label, px(z.x), py(z.y) + 4, 7);
    label(
      page,
      regular,
      `${metres(z.w)} x ${metres(z.h)}`,
      px(z.x),
      py(z.y) - 5,
      6,
      SOFT
    );
  }

  // Tables, with their name and seats.
  for (const t of tables) {
    const top = tableTop(t.shape, t.capacity);
    const cx = px(t.x);
    const cy = py(t.y);
    if (top.kind === "circle") {
      page.drawCircle({
        x: cx,
        y: cy,
        size: (top.w / 2) * scale,
        color: rgb(1, 1, 1),
        borderColor: BURGUNDY,
        borderWidth: 0.8,
      });
    } else {
      const w = top.w * scale;
      const h = top.h * scale;
      const turned = Math.round(((t.rot % 180) + 180) % 180) === 90;
      page.drawRectangle({
        x: cx - (turned ? h : w) / 2,
        y: cy - (turned ? w : h) / 2,
        width: turned ? h : w,
        height: turned ? w : h,
        color: rgb(1, 1, 1),
        borderColor: BURGUNDY,
        borderWidth: 0.8,
      });
    }
    const size = Math.max(4.5, Math.min(7, scale * 0.45));
    label(
      page,
      bold,
      t.name.replace(/^Table\s+/i, "T"),
      cx,
      cy + size * 0.55,
      size,
      BURGUNDY
    );
    label(
      page,
      regular,
      t.seated !== undefined
        ? `${t.seated}/${t.capacity}`
        : `${t.capacity} seats`,
      cx,
      cy - size * 0.65,
      size * 0.85,
      SOFT
    );
  }

  // A 5 m scale bar and the totals.
  const bar = 5 * scale;
  page.drawRectangle({ x: 40, y: 40, width: bar, height: 4, color: INK });
  page.drawText("0", { x: 38, y: 48, size: 7, font: regular, color: SOFT });
  page.drawText("5 m", {
    x: 40 + bar - 6,
    y: 48,
    size: 7,
    font: regular,
    color: SOFT,
  });
  const seats = tables.reduce((a, t) => a + t.capacity, 0);
  page.drawText(winAnsi(`${tables.length} tables, ${seats} seats`), {
    x: 40 + bar + 20,
    y: 40,
    size: 9,
    font: bold,
    color: INK,
  });
  page.drawText(
    winAnsi(
      "Drawn to scale from the Ariya seating plan. Check exits and aisles against the venue's own rules."
    ),
    { x: 40, y: 22, size: 7, font: regular, color: SOFT }
  );

  return doc.save();
}
