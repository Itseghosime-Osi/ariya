export const INVITATION_THEMES = [
  "royal_gold",
  "emerald_regal",
  "sunset_asoebi",
  "monochrome_velvet",
] as const;

export type InvitationTheme = (typeof INVITATION_THEMES)[number];

export const INVITATION_THEME_LABELS: Record<InvitationTheme, string> = {
  royal_gold: "Royal Gold",
  emerald_regal: "Emerald Regal",
  sunset_asoebi: "Sunset Aso-Ebi",
  monochrome_velvet: "Velvet Onyx",
};

export interface InvitationPalette {
  /** Card paper, top of the ivory gradient. */
  paper: string;
  /** Card paper, bottom edge. */
  paperEdge: string;
  ink: string;
  title: string;
  body: string;
  accent: string;
  foil: string;
  ribbonA: string;
  ribbonB: string;
  /** The velvet stage the card is photographed on. */
  stageFrom: string;
  stageTo: string;
}

export type InvitationBackgroundKind = "paper" | "velvet" | "image";

export interface InvitationBackground {
  kind: InvitationBackgroundKind;
  imageUrl: string | null;
  /** How much paper tint sits over an imported image, 0 to 0.9. */
  overlay: number;
}

export const INVITATION_LAYER_KINDS = [
  "seal",
  "kicker",
  "names",
  "message",
  "divider",
  "date",
  "venue",
  "dressCode",
  "footer",
  "text",
  /** Carries a guest's entry code as a pattern in the design; guests are never shown a QR. */
  "code",
] as const;

export type InvitationLayerKind = (typeof INVITATION_LAYER_KINDS)[number];

export const INVITATION_LAYER_LABELS: Record<InvitationLayerKind, string> = {
  seal: "Wax seal",
  kicker: "Eyebrow",
  names: "Names",
  message: "Message",
  divider: "Gold rule",
  date: "Date",
  venue: "Venue",
  dressCode: "Dress code",
  footer: "Reply line",
  text: "Text",
  code: "Entry seal",
};

export type InvitationTextAlign = "left" | "center" | "right";

export type InvitationColorRole =
  "ink" | "title" | "body" | "accent" | "foil" | "custom";

export interface InvitationLayer {
  id: string;
  kind: InvitationLayerKind;
  text: string;
  /** Left edge, as a percentage of the card's width. */
  x: number;
  /** Top edge, as a percentage of the card's height. */
  y: number;
  /** Box width, as a percentage of the card's width. */
  width: number;
  align: InvitationTextAlign;
  font: "display" | "sans";
  /** Font size in container-query width units, so the card scales as one. */
  size: number;
  weight: 400 | 500 | 600 | 700;
  italic: boolean;
  /** Letter spacing in em. */
  tracking: number;
  colorRole: InvitationColorRole;
  color: string | null;
  visible: boolean;
}

export interface InvitationDesign {
  version: 1;
  theme: InvitationTheme;
  palette: InvitationPalette;
  background: InvitationBackground;
  layers: InvitationLayer[];
}

export interface InvitationEventContent {
  title?: string | null;
  couple?: string | null;
  date?: string | null;
  venue?: string | null;
  area?: string | null;
  dressCode?: string | null;
  rsvpBy?: string | null;
  theme?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  message?: string | null;
  design?: unknown;
}

export interface InvitationGuest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  side: string | null;
  groupName: string | null;
  partySize: number;
  displaySeats: number;
  isVip: boolean;
  rsvpToken: string;
  invitedAt: string | null;
  rsvpStatus: "pending" | "accepted" | "declined";
}

export interface InvitationDeskData {
  eventId: string;
  eventTitle: string;
  coupleName: string;
  eventDate: string;
  venueName: string;
  area: string | null;
  dressCode: string | null;
  rsvpBy: string | null;
  isPaid: boolean;
  totalGuests: number;
  invitedGuestsCount: number;
  uninvitedGuestsCount: number;
  guests: InvitationGuest[];
  design: InvitationDesign;
}
