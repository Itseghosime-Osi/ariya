import { formatEventDate } from "@/lib/format";
import { invitationDesignSchema } from "./schemas";
import {
  INVITATION_THEMES,
  type InvitationDesign,
  type InvitationEventContent,
  type InvitationLayer,
  type InvitationLayerKind,
  type InvitationPalette,
  type InvitationTheme,
} from "./types";

/** The card is a portrait 5:7, like printed stationery. */
export const INVITATION_ASPECT = 5 / 7;

export const THEME_PALETTES: Record<InvitationTheme, InvitationPalette> = {
  royal_gold: {
    paper: "#fffaf0",
    paperEdge: "#efe3cc",
    ink: "#2a2118",
    title: "#6e1426",
    body: "#4a3a30",
    accent: "#7a5612",
    foil: "#b8864b",
    ribbonA: "#6b1e2e",
    ribbonB: "#b8864b",
    stageFrom: "#2a0e17",
    stageTo: "#120307",
  },
  emerald_regal: {
    paper: "#f7faf4",
    paperEdge: "#dfe8d9",
    ink: "#16251b",
    title: "#0b3b2b",
    body: "#34463a",
    accent: "#2e6a4f",
    foil: "#9a8a4f",
    ribbonA: "#0b3b2b",
    ribbonB: "#b08d4f",
    stageFrom: "#062419",
    stageTo: "#041a12",
  },
  sunset_asoebi: {
    paper: "#fdf4e9",
    paperEdge: "#f0ddc4",
    ink: "#3b1a0c",
    title: "#8a2c10",
    body: "#5c4030",
    accent: "#a4531f",
    foil: "#c98a4a",
    ribbonA: "#8a2c10",
    ribbonB: "#d9a05b",
    stageFrom: "#3d1405",
    stageTo: "#260c03",
  },
  monochrome_velvet: {
    paper: "#f5f3f0",
    paperEdge: "#e2ded9",
    ink: "#1c1a19",
    title: "#27272a",
    body: "#4a4642",
    accent: "#5f5a55",
    foil: "#a99f92",
    ribbonA: "#27272a",
    ribbonB: "#a99f92",
    stageFrom: "#18181b",
    stageTo: "#09090b",
  },
};

export function isInvitationTheme(value: unknown): value is InvitationTheme {
  return (
    typeof value === "string" &&
    (INVITATION_THEMES as readonly string[]).includes(value)
  );
}

/** The database has stored both `royal_gold` and `royal-gold` over time. */
export function normaliseTheme(value: unknown): InvitationTheme {
  if (typeof value !== "string") return "royal_gold";
  const key = value.trim().replace(/-/g, "_");
  return isInvitationTheme(key) ? key : "royal_gold";
}

export function paletteForTheme(theme: InvitationTheme): InvitationPalette {
  return { ...THEME_PALETTES[theme] };
}

export function resolveLayerColour(
  layer: InvitationLayer,
  palette: InvitationPalette
): string {
  if (layer.colorRole === "custom" && layer.color) return layer.color;
  const role = layer.colorRole === "custom" ? "ink" : layer.colorRole;
  return palette[role];
}

function textLayer(
  kind: InvitationLayerKind,
  text: string,
  layout: Pick<InvitationLayer, "x" | "y" | "width">,
  style: Partial<InvitationLayer> = {}
): InvitationLayer {
  return {
    id: kind,
    kind,
    text,
    x: layout.x,
    y: layout.y,
    width: layout.width,
    align: "center",
    font: "sans",
    size: 3.4,
    weight: 400,
    italic: false,
    tracking: 0,
    colorRole: "body",
    color: null,
    visible: text.trim().length > 0,
    ...style,
  };
}

/** The house stationery layout: seal, names, words, a gold rule, then the facts. */
export function defaultInvitationLayers(
  event: InvitationEventContent
): InvitationLayer[] {
  const seenVenueParts = new Set<string>();
  const venue = [event.venue, event.area]
    .flatMap((part) => part?.split(",") ?? [])
    .map((part) => part.trim())
    .filter((part) => {
      const key = part.toLocaleLowerCase("en-NG");
      if (!part || seenVenueParts.has(key)) return false;
      seenVenueParts.add(key);
      return true;
    })
    .join(", ");
  const names =
    event.headline?.trim() ||
    event.couple?.trim() ||
    event.title?.trim() ||
    "Your celebration";
  const kicker = event.subheadline?.trim() || "Together with their families";
  const message =
    event.message?.trim() ||
    "request the pleasure of your company as they celebrate their union";
  const dateLabel = event.date
    ? formatEventDate(event.date)
    : "Date to be announced";
  const replyLine = event.rsvpBy
    ? `Kindly reply by ${formatEventDate(event.rsvpBy).split(" · ")[0]}`
    : "Kindly reply";

  return [
    {
      id: "seal",
      kind: "seal",
      text: names,
      x: 42,
      y: 7,
      width: 16,
      align: "center",
      font: "display",
      size: 8,
      weight: 600,
      italic: false,
      tracking: 0,
      colorRole: "custom",
      color: null,
      visible: true,
    },
    textLayer(
      "kicker",
      kicker,
      { x: 10, y: 27, width: 80 },
      {
        size: 2.9,
        weight: 600,
        tracking: 0.28,
        colorRole: "accent",
      }
    ),
    textLayer(
      "names",
      names,
      { x: 8, y: 31.5, width: 84 },
      {
        font: "display",
        size: Math.min(
          7.4,
          Math.max(2.5, 7.4 * Math.sqrt(34 / Math.max(34, names.length)))
        ),
        weight: 700,
        colorRole: "title",
      }
    ),
    textLayer(
      "message",
      message,
      { x: 12, y: 47.5, width: 76 },
      {
        size: 3.5,
        colorRole: "body",
      }
    ),
    {
      id: "divider",
      kind: "divider",
      text: "",
      x: 12,
      y: 62.5,
      width: 76,
      align: "center",
      font: "sans",
      size: 3,
      weight: 400,
      italic: false,
      tracking: 0,
      colorRole: "foil",
      color: null,
      visible: true,
    },
    textLayer(
      "date",
      dateLabel,
      { x: 10, y: 66.5, width: 80 },
      {
        size: 4.1,
        weight: 600,
        colorRole: "ink",
      }
    ),
    textLayer(
      "venue",
      venue || "Venue to be announced",
      {
        x: 10,
        y: 72,
        width: 80,
      },
      { size: venue.length > 45 ? 3.0 : 3.4, lineHeight: 1.2 }
    ),
    textLayer(
      "dressCode",
      event.dressCode?.trim() ? `Dress code: ${event.dressCode.trim()}` : "",
      { x: 10, y: 78, width: 80 },
      {
        size: (event.dressCode?.length ?? 0) > 45 ? 3.0 : 3.2,
        lineHeight: 1.2,
        italic: true,
        colorRole: "body",
      }
    ),
    textLayer(
      "footer",
      replyLine,
      { x: 27, y: 88, width: 63 },
      {
        size: 2.9,
        weight: 600,
        tracking: 0.24,
        colorRole: "accent",
      }
    ),
  ];
}

/** True when the design carries the entry seal, so guests are given the seal and no QR box. */
export function hasEntrySeal(design: InvitationDesign | null): boolean {
  return Boolean(
    design?.layers.some((layer) => layer.kind === "code" && layer.visible)
  );
}

/**
 * The card as a guest receives it when the host has switched the access pass on: if the host did
 * not place an entry seal, one is added in the house spot, so a pass is never missing from a card
 * that needs one. A seal the host did place (and moved) is left exactly where they put it.
 */
export function ensureEntrySeal(design: InvitationDesign): InvitationDesign {
  if (design.layers.some((layer) => layer.kind === "code")) {
    return {
      ...design,
      layers: design.layers.map((layer) =>
        layer.kind === "code" ? { ...layer, visible: true } : layer
      ),
    };
  }
  return {
    ...design,
    layers: [...design.layers, createLayerOfKind("code", design.layers.length)],
  };
}

export function createInvitationDesign(
  event: InvitationEventContent
): InvitationDesign {
  const theme = normaliseTheme(event.theme);
  return {
    version: 1,
    theme,
    palette: paletteForTheme(theme),
    background: { kind: "paper", imageUrl: null, overlay: 0.2 },
    layers: defaultInvitationLayers(event),
  };
}

/** Accepts the stored JSON (or a pasted design file) and returns a safe document. */
export function normaliseDesign(input: unknown): InvitationDesign | null {
  if (input == null) return null;
  let candidate = input;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  const parsed = invitationDesignSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/** The one design under an event: what the host saved, or the house card if nothing is saved. */
export function designFromEvent(
  event: InvitationEventContent
): InvitationDesign {
  return normaliseDesign(event.design) ?? createInvitationDesign(event);
}

/** Swap the theme palette without touching the host's words or layout. */
export function applyInvitationTheme(
  design: InvitationDesign,
  theme: InvitationTheme
): InvitationDesign {
  return { ...design, theme, palette: paletteForTheme(theme) };
}

/**
 * The legacy columns every other screen and RPC reads. Keeping them in step means a design saved
 * in the studio still reaches the guest pass, emails and the connected AI.
 */
export function designColumns(design: InvitationDesign): {
  invitation_theme: InvitationTheme;
  invitation_headline: string | null;
  invitation_subheadline: string | null;
  invitation_message: string | null;
  dress_code: string | null;
} {
  const textOf = (kind: InvitationLayerKind) =>
    design.layers.find((layer) => layer.kind === kind)?.text.trim() || null;
  const dressCode = textOf("dressCode");
  return {
    invitation_theme: design.theme,
    invitation_headline: textOf("names")?.slice(0, 120) ?? null,
    invitation_subheadline: textOf("kicker")?.slice(0, 240) ?? null,
    invitation_message: textOf("message")?.slice(0, 1000) ?? null,
    dress_code: dressCode
      ? dressCode.replace(/^dress code\s*[:\-–]\s*/i, "").slice(0, 150)
      : null,
  };
}

const BLANK_TEXT_LAYER: Omit<InvitationLayer, "id" | "kind"> = {
  text: "Your words",
  x: 20,
  y: 40,
  width: 60,
  align: "center",
  font: "display",
  size: 5,
  weight: 600,
  italic: false,
  tracking: 0,
  colorRole: "ink",
  color: null,
  visible: true,
};

/** A fresh layer for the canvas tools. Text lands mid-card; extras sit above the house layout. */
export function createLayerOfKind(
  kind: "text" | "seal" | "divider" | "code",
  existingCount: number
): InvitationLayer {
  const id = `${kind}-${Date.now().toString(36)}-${existingCount}`;
  if (kind === "code") {
    return {
      ...BLANK_TEXT_LAYER,
      id,
      kind,
      text: "",
      x: 5,
      y: 83.5,
      width: 19,
      size: 3,
      colorRole: "title",
      color: null,
    };
  }
  if (kind === "seal") {
    return {
      ...BLANK_TEXT_LAYER,
      id,
      kind,
      text: "",
      x: 42,
      y: 36,
      width: 16,
      size: 8,
      colorRole: "custom",
      color: null,
    };
  }
  if (kind === "divider") {
    return {
      ...BLANK_TEXT_LAYER,
      id,
      kind,
      text: "",
      x: 20,
      y: 50,
      width: 60,
      size: 3,
      weight: 400,
      colorRole: "foil",
      color: null,
    };
  }
  return { ...BLANK_TEXT_LAYER, id, kind };
}
