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
        panel:
          "bg-[var(--studio-dialog-dark)] text-[var(--studio-dialog-text-dark)] border-white/10",
        title: "text-[var(--studio-cream)]",
        strong: "text-[var(--studio-cream)]",
        muted: "text-[var(--studio-dialog-muted-dark)]",
        divider: "border-white/10",
        rows: "divide-white/10",
        card: "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]",
        cardOn:
          "border-[var(--studio-gold)] bg-[var(--studio-gold)]/10 ring-2 ring-[var(--studio-gold)]/25 hover:bg-[var(--studio-gold)]/15",
        badge: "bg-white/10 text-[var(--studio-dialog-text-dark)]",
        badgeOn: "bg-[var(--studio-gold)] text-[var(--studio-on-gold)]",
        well: "border-white/10 bg-white/[0.05]",
        primary:
          "bg-[var(--studio-gold)] text-[var(--studio-on-gold)] hover:bg-[var(--studio-gold-hover-2)]",
        ghost:
          "text-[var(--studio-dialog-muted-dark)] hover:text-[var(--studio-cream)] hover:bg-white/10",
        field: "border-white/15 bg-white/[0.06]",
        accentText: "text-[var(--studio-gold)]",
        error: "bg-red-500/15 text-red-200",
      }
    : {
        overlay: "bg-black/60",
        panel:
          "bg-[var(--studio-ivory-text)] text-[var(--studio-ink)] border-[var(--studio-line)]",
        title: "text-[var(--studio-wine)]",
        strong: "text-[var(--studio-ink)]",
        muted: "text-[var(--studio-dialog-muted-light)]",
        divider: "border-[var(--studio-line)]",
        rows: "divide-[var(--studio-line)]",
        card: "border-[var(--studio-line)] bg-white/70 hover:bg-white",
        cardOn:
          "border-[var(--studio-wine)] bg-[var(--studio-wine)]/5 ring-2 ring-[var(--studio-wine)]/20",
        badge: "bg-[var(--studio-wine)]/8 text-[var(--studio-wine)]",
        badgeOn: "bg-[var(--studio-wine)] text-[var(--studio-cream)]",
        well: "border-[var(--studio-line)] bg-[var(--studio-wine)]/[0.04]",
        primary:
          "bg-[var(--studio-wine)] text-[var(--studio-cream)] hover:bg-[var(--studio-wine-3)]",
        ghost:
          "text-[var(--studio-dialog-muted-light)] hover:text-[var(--studio-wine)] hover:bg-black/5",
        field: "border-[var(--studio-line)] bg-white",
        accentText: "text-[var(--studio-wine)]",
        error: "bg-red-500/10 text-red-800",
      };
}
