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

export type InvitationBackgroundKind = "paper" | "velvet" | "image" | "color";

export interface InvitationBackground {
  kind: InvitationBackgroundKind;
  /** The flat colour when kind is "color". */
  color?: string | null;
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
  /** A drawn rectangle, ellipse or line. */
  "shape",
  /** A picture: a photo, a logo, or an imported card. */
  "image",
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
  shape: "Shape",
  image: "Image",
};

export const INVITATION_SHAPES = ["rect", "ellipse", "line"] as const;
export type InvitationShape = (typeof INVITATION_SHAPES)[number];

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

  // Everything below arrived with the free-form designer. All of it is optional, so a design
  // saved before it existed still loads and draws exactly as it did.
  /** The name the host gave the layer in the layers panel. */
  name?: string;
  /** Box height as a percentage of the card's height. Shapes and images; text grows with its words. */
  height?: number;
  /** Degrees, clockwise, about the layer's centre. */
  rotation?: number;
  /** 0 to 1. */
  opacity?: number;
  /** Shape fill, or null for none. */
  fill?: string | null;
  /** Shape outline, or null for none. */
  stroke?: string | null;
  /** Outline thickness in container-query width units. */
  strokeWidth?: number;
  /** Corner rounding in container-query width units. */
  radius?: number;
  shape?: InvitationShape;
  imageUrl?: string | null;
  fit?: "cover" | "contain";
  /** A locked layer cannot be moved or deleted from the canvas. */
  locked?: boolean;
}

export interface InvitationCanvas {
  /** Width divided by height. 5:7 portrait stationery is 0.714. */
  ratio: number;
}

export interface InvitationDesign {
  version: 1;
  /** The card's shape. Absent means the house 5:7 portrait card. */
  canvas?: InvitationCanvas;
  /** False hides the house ribbon, inner border and foil sheen, for a card drawn from scratch. */
  chrome?: boolean;
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
