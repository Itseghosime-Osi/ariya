import {
  applyInvitationTheme,
  createInvitationDesign,
  resolveLayerColour,
} from "./design";
import {
  INVITATION_THEME_LABELS,
  type InvitationDesign,
  type InvitationEventContent,
  type InvitationLayer,
  type InvitationTheme,
} from "./types";

export interface InvitationDraft {
  design: InvitationDesign;
  /** One line the studio can show, in the host's own terms. */
  summary: string;
}

const THEME_HINTS: { theme: InvitationTheme; words: string[] }[] = [
  {
    theme: "emerald_regal",
    words: ["emerald", "green", "forest", "garden", "sage", "jade"],
  },
  {
    theme: "sunset_asoebi",
    words: [
      "sunset",
      "orange",
      "peach",
      "terracotta",
      "aso ebi",
      "aso-ebi",
      "warm",
    ],
  },
  {
    theme: "monochrome_velvet",
    words: [
      "monochrome",
      "black and white",
      "black-and-white",
      "minimal",
      "mono",
      "onyx",
      "grey",
      "gray",
    ],
  },
  {
    theme: "royal_gold",
    words: ["gold", "royal", "burgundy", "wine", "classic", "traditional"],
  },
];

const KICKERS: { words: string[]; text: string }[] = [
  {
    words: ["traditional", "owambe", "aso ebi", "aso-ebi", "engagement"],
    text: "The Traditional Wedding Celebration of",
  },
  {
    words: ["beach", "destination", "shore", "seaside"],
    text: "Together by the shore",
  },
  {
    words: ["garden", "outdoor", "outdoors", "floral"],
    text: "In the garden, with joy",
  },
  {
    words: ["minimal", "modern", "clean", "editorial"],
    text: "You are invited",
  },
];

const MESSAGES: { words: string[]; text: string }[] = [
  {
    words: ["traditional", "owambe", "aso ebi", "aso-ebi"],
    text: "With the blessings of our families, we invite you to celebrate our union.",
  },
  {
    words: ["beach", "destination", "shore", "seaside"],
    text: "Join us where the water meets the sky, as we say yes to forever.",
  },
  {
    words: ["garden", "outdoor", "outdoors", "floral"],
    text: "Among the flowers and the people we love, we invite you to celebrate with us.",
  },
  {
    words: ["minimal", "modern", "clean", "editorial"],
    text: "We would love for you to join us.",
  },
];

function hasAny(prompt: string, words: string[]): boolean {
  return words.some((word) => prompt.includes(word));
}

function pickTheme(prompt: string): InvitationTheme {
  let best: { theme: InvitationTheme; score: number } = {
    theme: "royal_gold",
    score: 0,
  };
  for (const hint of THEME_HINTS) {
    const score = hint.words.filter((word) => prompt.includes(word)).length;
    if (score > best.score) best = { theme: hint.theme, score };
  }
  return best.theme;
}

function updateLayer(
  design: InvitationDesign,
  kind: InvitationLayer["kind"],
  patch: Partial<InvitationLayer>
): InvitationDesign {
  return {
    ...design,
    layers: design.layers.map((layer) =>
      layer.kind === kind ? { ...layer, ...patch } : layer
    ),
  };
}

/**
 * Turns a host's words into a complete design. It is deliberately deterministic: the same prompt
 * always gives the same card, so a host can ask for a change and see exactly what changed.
 */
export function draftInvitationDesign(
  prompt: string,
  event: InvitationEventContent
): InvitationDraft {
  const words = prompt.trim().toLowerCase();
  const theme = pickTheme(words);
  let design = applyInvitationTheme(createInvitationDesign(event), theme);

  const velvet = hasAny(words, [
    "velvet",
    "night",
    "evening",
    "black tie",
    "black-tie",
    "dramatic",
    "dark",
    "midnight",
  ]);
  design = {
    ...design,
    background: {
      ...design.background,
      kind: velvet ? "velvet" : "paper",
    },
  };

  const kicker = KICKERS.find((entry) => hasAny(words, entry.words));
  if (kicker) design = updateLayer(design, "kicker", { text: kicker.text });

  const message = MESSAGES.find((entry) => hasAny(words, entry.words));
  if (message) design = updateLayer(design, "message", { text: message.text });

  if (hasAny(words, ["minimal", "modern", "clean", "editorial"])) {
    design = updateLayer(design, "names", {
      font: "sans",
      weight: 600,
      size: 6.6,
      tracking: 0.02,
    });
    design = updateLayer(design, "kicker", { tracking: 0.2 });
  } else if (hasAny(words, ["bold", "dramatic", "loud", "big"])) {
    design = updateLayer(design, "names", {
      font: "display",
      weight: 700,
      size: 8.4,
      tracking: 0.01,
    });
  } else if (hasAny(words, ["romantic", "soft", "classic", "traditional"])) {
    design = updateLayer(design, "names", {
      font: "display",
      weight: 700,
      size: 7.4,
    });
    design = updateLayer(design, "message", { italic: true });
  }

  if (hasAny(words, ["no seal", "without seal", "no wax"])) {
    design = updateLayer(design, "seal", { visible: false });
  }
  if (hasAny(words, ["no dress code", "without dress code"])) {
    design = updateLayer(design, "dressCode", { visible: false });
  }
  if (hasAny(words, ["no message", "without message"])) {
    design = updateLayer(design, "message", { visible: false });
  }

  const fontLabel =
    design.layers.find((layer) => layer.kind === "names")?.font === "sans"
      ? "sans-serif names"
      : "display names";
  const backgroundLabel = velvet ? "velvet stage" : "ivory paper";
  return {
    design,
    summary: `${INVITATION_THEME_LABELS[theme]} palette, ${fontLabel}, ${backgroundLabel}.`,
  };
}

/** A brief a host can paste into Claude, ChatGPT or a design tool. */
export function invitationDesignBrief(
  design: InvitationDesign,
  event: InvitationEventContent
): string {
  const textOf = (kind: InvitationLayer["kind"]) =>
    design.layers.find((layer) => layer.kind === kind)?.text ?? "";
  const palette = design.palette;
  return [
    `Invitation design brief — ${event.couple || event.title || "celebration"}`,
    `Theme: ${INVITATION_THEME_LABELS[design.theme]}`,
    `Background: ${design.background.kind}`,
    `Eyebrow: ${textOf("kicker")}`,
    `Names: ${textOf("names")}`,
    `Message: ${textOf("message")}`,
    `Date: ${textOf("date")}`,
    `Venue: ${textOf("venue")}`,
    `Dress code: ${textOf("dressCode")}`,
    `Reply line: ${textOf("footer")}`,
    `Palette: paper ${palette.paper}, ink ${palette.ink}, title ${palette.title}, accent ${palette.accent}, foil ${palette.foil}`,
    `Names colour: ${resolveLayerColour(
      design.layers.find((layer) => layer.kind === "names") ?? design.layers[0],
      palette
    )}`,
  ].join("\n");
}
