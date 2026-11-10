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

export const INVITATION_SHAPES = [
  "rect",
  "ellipse",
  "line",
  "arch",
  "star",
  "diamond",
  "crest",
  "triangle",
] as const;
export type InvitationShape = (typeof INVITATION_SHAPES)[number];

export const INVITATION_SHAPE_LABELS: Record<InvitationShape, string> = {
  rect: "Rectangle",
  ellipse: "Circle",
  line: "Line",
  arch: "Cathedral Arch",
  star: "Star / Sparkle",
  diamond: "Diamond",
  crest: "Crest / Shield",
  triangle: "Triangle",
};

export const INVITATION_FONTS = [
  "display",
  "sans",
  "script",
  "serif",
  "mono",
] as const;
export type InvitationFont = (typeof INVITATION_FONTS)[number];

export const INVITATION_FONT_LABELS: Record<InvitationFont, string> = {
  display: "Bodoni Display (High-contrast Serif)",
  sans: "Plus Jakarta (Modern Clean Sans)",
  script: "Great Vibes (Formal Calligraphy)",
  serif: "Cormorant (Editorial Roman)",
  mono: "Modernist Mono (Architectural)",
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
  font: InvitationFont;
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
  /** Mirror horizontally. */
  flipX?: boolean;
  /** Mirror vertically. */
  flipY?: boolean;
  /** 0 to 1. */
  opacity?: number;
  /** Line height / leading multiplier (e.g. 1.0 to 2.5, default: 1.35). */
  lineHeight?: number;
  /** Text transformation case. */
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  /** Optional luxury shadow or foil glow effect. */
  shadow?: "none" | "soft" | "foil" | "glow";
  /** CSS mix-blend-mode (e.g. "normal", "multiply", "screen", "overlay") */
  blendMode?: string;
  /** Gaussian blur effect in pixels */
  blur?: number;
  /** Image adjustment: brightness offset (-100 to 100, default: 0) */
  brightness?: number;
  /** Image adjustment: contrast offset (-100 to 100, default: 0) */
  contrast?: number;
  /** Image adjustment: saturation offset (-100 to 100, default: 0) */
  saturate?: number;
  /** Image adjustment: sepia / warmth percentage (0 to 100, default: 0) */
  sepia?: number;
  /** Image adjustment: grayscale percentage (0 to 100, default: 0) */
  grayscale?: number;
  /** Custom shadow blur in px (0 to 50) */
  shadowBlur?: number;
  /** Custom shadow horizontal offset in px */
  shadowX?: number;
  /** Custom shadow vertical offset in px */
  shadowY?: number;
  /** Custom shadow color */
  shadowColor?: string | null;
  /** Linear or radial gradient background string */
  gradient?: string;
  /** Independent top-left corner rounding in container-query width units. */
  radiusTL?: number;
  /** Independent top-right corner rounding in container-query width units. */
  radiusTR?: number;
  /** Independent bottom-right corner rounding in container-query width units. */
  radiusBR?: number;
  /** Independent bottom-left corner rounding in container-query width units. */
  radiusBL?: number;
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
  /** Optional frame / clipping mask for photos (e.g. arch, circle, diamond, crest) */
  maskShape?: InvitationShape;
  /** Horizontal focal alignment percentage for cropped photos (0 to 100, default: 50) */
  focalX?: number;
  /** Vertical focal alignment percentage for cropped photos (0 to 100, default: 50) */
  focalY?: number;
  /** Group ID when multiple layers are grouped together. */
  groupId?: string;
  /** A locked layer cannot be moved or deleted from the canvas. */
  locked?: boolean;
  /** Use the same proportional resize rule in numeric fields and canvas handles. */
  aspectLocked?: boolean;
}

export type PaperEdge = "sharp" | "rounded" | "deckled";

export interface InvitationCanvas {
  /** Width divided by height. 5:7 portrait stationery is 0.714. */
  ratio: number;
  /** Width of the design canvas in pixels (default: 1080). */
  widthPx?: number;
  /** Height of the design canvas in pixels (default: 1350 or 1512). */
  heightPx?: number;
  /** Paper edge styling: sharp cut paper (0px radius), rounded luxury corners, or torn deckled edge. */
  edgeStyle?: PaperEdge;
  /** Corner radius in pixels when edgeStyle is "rounded". */
  cornerRadiusPx?: number;
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
