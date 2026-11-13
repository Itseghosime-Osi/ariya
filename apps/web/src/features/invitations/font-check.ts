/**
 * Fonts that failed to load AND are used by the card (B3). The export still runs, because a card
 * with a fallback font is better than no card, but the host is told which font was missing so the
 * change is never silent.
 */
export function failedCardFonts(
  card: HTMLElement | null,
  fonts: Pick<FontFaceSet, "forEach"> | undefined = typeof document !==
  "undefined"
    ? document.fonts
    : undefined
): string[] {
  if (!card || !fonts) return [];
  const failed = new Set<string>();
  fonts.forEach((face) => {
    if (face.status === "error")
      failed.add(face.family.replace(/^["']|["']$/g, "").trim());
  });
  if (!failed.size) return [];
  const used: string[] = [];
  card.querySelectorAll<HTMLElement>("*").forEach((el) => {
    if (el.children.length === 0 && el.textContent?.trim())
      used.push(getComputedStyle(el).fontFamily.toLowerCase());
  });
  return [...failed].filter((family) =>
    used.some((u) => u.includes(family.toLowerCase()))
  );
}

/** One plain sentence for the notice shown after such an export. */
export function missingFontMessage(families: string[]): string {
  const list =
    families.length === 1
      ? `the font ${families[0]}`
      : `the fonts ${families.join(", ")}`;
  return `Exported, but ${list} could not be loaded, so the file uses a plain fallback font. Check your connection, reload the page and export again to get the real font.`;
}
