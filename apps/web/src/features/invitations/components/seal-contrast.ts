import type { InvitationPalette } from "../types";
function luminance(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return NaN;
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) =>
      v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    );
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** Keep the chosen colours when readable; protect only the machine-readable seal on unsafe custom palettes. */
export function entrySealColours(palette: InvitationPalette) {
  const paper = luminance(palette.paper) >= 0.5 ? palette.paper : "#fffaf0";
  const ink =
    contrast(palette.title, paper) >= 4.5 &&
    luminance(palette.title) < luminance(paper)
      ? palette.title
      : contrast(palette.ink, paper) >= 4.5 &&
          luminance(palette.ink) < luminance(paper)
        ? palette.ink
        : "#2a2118";
  return {
    paper,
    ink,
    forcePlate:
      paper !== palette.paper ||
      ink !== palette.title ||
      !(contrast(ink, palette.paperEdge) >= 4.5),
  };
}
