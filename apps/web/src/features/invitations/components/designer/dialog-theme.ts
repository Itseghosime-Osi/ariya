/**
 * Colours for the studio's dialogs, chosen from the studio's own light/dark setting. The `dark:`
 * variants in Tailwind follow the computer's dark mode instead, which can disagree with the studio
 * (a dark computer with a light studio gave a dark panel with light-theme, nearly invisible text).
 * Every pair below has at least 4.5:1 contrast for text on its own surface.
 */
export function dialogTheme(dark: boolean) {
  return dark
    ? {
        overlay: "bg-black/65",
        panel: "bg-[#1a1118] text-[#f6ead0] border-white/10",
        title: "text-[#fff6dc]",
        strong: "text-[#fff6dc]",
        muted: "text-[#d8c8ce]",
        divider: "border-white/10",
        rows: "divide-white/10",
        card: "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]",
        cardOn:
          "border-[#dfba73] bg-[#dfba73]/10 ring-2 ring-[#dfba73]/25 hover:bg-[#dfba73]/15",
        badge: "bg-white/10 text-[#f6ead0]",
        badgeOn: "bg-[#dfba73] text-[#2a070d]",
        well: "border-white/10 bg-white/[0.05]",
        primary: "bg-[#dfba73] text-[#2a070d] hover:bg-[#e8c987]",
        ghost: "text-[#d8c8ce] hover:text-[#fff6dc] hover:bg-white/10",
        field: "border-white/15 bg-white/[0.06]",
        accentText: "text-[#dfba73]",
        error: "bg-red-500/15 text-red-200",
      }
    : {
        overlay: "bg-black/60",
        panel:
          "bg-[#fffaf0] text-[var(--studio-ink)] border-[var(--studio-line)]",
        title: "text-[var(--studio-wine)]",
        strong: "text-[var(--studio-ink)]",
        muted: "text-[#5f4a52]",
        divider: "border-[var(--studio-line)]",
        rows: "divide-[var(--studio-line)]",
        card: "border-[var(--studio-line)] bg-white/70 hover:bg-white",
        cardOn:
          "border-[var(--studio-wine)] bg-[var(--studio-wine)]/5 ring-2 ring-[var(--studio-wine)]/20",
        badge: "bg-[var(--studio-wine)]/8 text-[var(--studio-wine)]",
        badgeOn: "bg-[var(--studio-wine)] text-[#fff6dc]",
        well: "border-[var(--studio-line)] bg-[var(--studio-wine)]/[0.04]",
        primary: "bg-[var(--studio-wine)] text-[#fff6dc] hover:bg-[#6e1426]",
        ghost:
          "text-[#5f4a52] hover:text-[var(--studio-wine)] hover:bg-black/5",
        field: "border-[var(--studio-line)] bg-white",
        accentText: "text-[var(--studio-wine)]",
        error: "bg-red-500/10 text-red-800",
      };
}
