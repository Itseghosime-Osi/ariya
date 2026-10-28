export interface GuestThemeConfig {
  topBar: string;
  badge: string;
  seal: string;
  headline: string;
  subheadline: string;
  label: string;
  primaryButton: string;
  secondaryButton: string;
  activeRadio: string;
  radioAccent: string;
  focusRing: string;
  passHeader: string;
  passBadge: string;
  noteBox: string;
  qrBox: string;
  codeBadge: string;
  accentText: string;
}

export const GUEST_THEMES: Record<string, GuestThemeConfig> = {
  royal_gold: {
    topBar: "from-wine via-gold to-wine",
    badge: "bg-wine/10 text-wine",
    seal: "bg-wine text-gold",
    headline: "text-wine",
    subheadline: "text-wine/80",
    label: "text-wine/80",
    primaryButton: "bg-wine hover:bg-wine/90 text-ivory",
    secondaryButton: "border-wine/40 text-wine hover:bg-wine/5",
    activeRadio: "bg-wine/5 border-wine text-wine font-medium shadow-sm",
    radioAccent: "text-wine focus:ring-wine",
    focusRing: "focus:ring-wine/40",
    passHeader: "text-wine/70 border-wine/10",
    passBadge: "text-wine bg-white/70 border-wine/20",
    noteBox: "bg-wine/5 border-wine/10 text-wine",
    qrBox: "border-wine/20 text-wine",
    codeBadge: "bg-wine/5 text-wine border-wine/20",
    accentText: "text-wine",
  },
  emerald_regal: {
    topBar: "from-emerald-950 via-emerald-500 to-emerald-950",
    badge: "bg-emerald-900/10 text-emerald-900",
    seal: "bg-emerald-900 text-emerald-300 border border-emerald-500/30",
    headline: "text-emerald-950",
    subheadline: "text-emerald-900/80",
    label: "text-emerald-900/80",
    primaryButton: "bg-emerald-800 hover:bg-emerald-900 text-ivory",
    secondaryButton:
      "border-emerald-800/40 text-emerald-900 hover:bg-emerald-50",
    activeRadio:
      "bg-emerald-50 border-emerald-700 text-emerald-950 font-medium shadow-sm",
    radioAccent: "text-emerald-800 focus:ring-emerald-700",
    focusRing: "focus:ring-emerald-600/40",
    passHeader: "text-emerald-800/80 border-emerald-900/10",
    passBadge: "text-emerald-900 bg-emerald-50 border-emerald-300",
    noteBox: "bg-emerald-900/5 border-emerald-900/10 text-emerald-900",
    qrBox: "border-emerald-800/20 text-emerald-900",
    codeBadge: "bg-emerald-50 text-emerald-950 border-emerald-300",
    accentText: "text-emerald-800",
  },
  sunset_asoebi: {
    topBar: "from-amber-950 via-orange-500 to-amber-950",
    badge: "bg-amber-900/10 text-amber-900",
    seal: "bg-amber-900 text-amber-300 border border-orange-500/30",
    headline: "text-amber-950",
    subheadline: "text-amber-900/80",
    label: "text-amber-900/80",
    primaryButton: "bg-amber-800 hover:bg-amber-900 text-ivory",
    secondaryButton: "border-amber-800/40 text-amber-900 hover:bg-amber-50",
    activeRadio:
      "bg-amber-50 border-amber-700 text-amber-950 font-medium shadow-sm",
    radioAccent: "text-amber-800 focus:ring-amber-700",
    focusRing: "focus:ring-amber-600/40",
    passHeader: "text-amber-800/80 border-amber-900/10",
    passBadge: "text-amber-900 bg-amber-50 border-amber-300",
    noteBox: "bg-amber-900/5 border-amber-900/10 text-amber-900",
    qrBox: "border-amber-800/20 text-amber-900",
    codeBadge: "bg-amber-50 text-amber-950 border-amber-300",
    accentText: "text-amber-800",
  },
  monochrome_velvet: {
    topBar: "from-stone-950 via-stone-400 to-stone-950",
    badge: "bg-stone-900/10 text-stone-900",
    seal: "bg-stone-900 text-stone-200 border border-stone-500/30",
    headline: "text-stone-950",
    subheadline: "text-stone-800/80",
    label: "text-stone-800/80",
    primaryButton: "bg-stone-900 hover:bg-stone-800 text-ivory",
    secondaryButton: "border-stone-800/40 text-stone-900 hover:bg-stone-100",
    activeRadio:
      "bg-stone-100 border-stone-800 text-stone-950 font-medium shadow-sm",
    radioAccent: "text-stone-900 focus:ring-stone-800",
    focusRing: "focus:ring-stone-600/40",
    passHeader: "text-stone-700 border-stone-900/10",
    passBadge: "text-stone-900 bg-stone-100 border-stone-300",
    noteBox: "bg-stone-900/5 border-stone-900/10 text-stone-900",
    qrBox: "border-stone-800/20 text-stone-900",
    codeBadge: "bg-stone-100 text-stone-950 border-stone-300",
    accentText: "text-stone-800",
  },
};

export function getGuestTheme(themeName?: string | null): GuestThemeConfig {
  if (!themeName) return GUEST_THEMES.royal_gold;
  const normalized = themeName.trim().replace(/-/g, "_");
  return GUEST_THEMES[normalized] || GUEST_THEMES.royal_gold;
}
