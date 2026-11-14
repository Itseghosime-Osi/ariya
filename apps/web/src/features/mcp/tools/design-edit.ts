import type { CallToolResult } from "@modelcontextprotocol/sdk/types";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { saveInvitationDesignAction } from "@/features/invitations/actions";
import {
  applyInvitationTheme,
  createLayerOfKind,
  ensureEntrySeal,
} from "@/features/invitations/design";
import { checkInvitationLayout } from "@/features/invitations/layout-check";
import {
  applyTextStyle,
  CANVAS_PRESETS,
  createShapeLayer,
  createTextStyle,
  moveLayerStack,
  resizeCanvasPx,
  updateTextStyle,
} from "@/features/invitations/layer-ops";
import { constrainEntrySeals } from "@/features/invitations/pass-layout";
import {
  applyLayoutPreset,
  LAYOUT_PRESETS,
} from "@/features/invitations/presets";
import { invitationDesignSchema } from "@/features/invitations/schemas";
import {
  INVITATION_LAYER_LABELS,
  INVITATION_THEME_LABELS,
  type InvitationDesign,
  type InvitationLayer,
} from "@/features/invitations/types";
import { saveDesignVersionAction } from "@/features/invitations/versions-actions";
import { requireWriteAccess, type ToolContext } from "../guard";
import { dataResult, errorResult, runTool } from "../result";
import {
  applyInvitationLookInput,
  editInvitationLayersInput,
  editInvitationStylesInput,
  editInvitationTextInput,
  replaceInvitationDesignInput,
  type ApplyInvitationLookArgs,
  type EditInvitationLayersArgs,
  type EditInvitationStylesArgs,
  type EditInvitationTextArgs,
  type ReplaceInvitationDesignArgs,
} from "../schemas";
import {
  DESIGN_TEXT_NOTE,
  loadInvitationDesign,
  type StoredInvitationDesign,
} from "./design-read";

/**
 * The studio's own document operations, exposed to a connected AI. Every tool follows the same
 * shape: write access, read the design, apply a pure edit with the same functions the studio
 * uses, keep the previous design as a version (one restore undoes the whole change), save
 * through the studio's revision check, and report what the layout check thinks of the result.
 */

/** The schema caps layers at 60; kept in step with `invitationLayerSchema`. */
const MAX_LAYERS = 60;
/** The studio keeps 30 versions; kept in step with `saveDesignVersionAction`. */
const MAX_TEXT_STYLES = 24;

const NO_ACCESS =
  "That celebration does not exist, or you do not have access to it.";

const ENTRY_SEAL_REFUSAL =
  "The entry seal carries each guest's entry code: it must stay on the card, visible and clear of other layers. Nothing was changed.";

function labelOf(layer: InvitationLayer): string {
  return layer.name?.trim() || INVITATION_LAYER_LABELS[layer.kind];
}

function quotedList(names: string[]): string {
  const quoted = names.map((name) => `"${name}"`);
  if (quoted.length <= 2) return quoted.join(" and ");
  return `${quoted.slice(0, -1).join(", ")} and ${quoted[quoted.length - 1]}`;
}

function presetName(id: string): string {
  return LAYOUT_PRESETS.find((preset) => preset.id === id)?.name ?? id;
}

function lockedRefusal(layers: InvitationLayer[]): string {
  const labels = [...new Set(layers.map(labelOf))];
  const many = labels.length > 1;
  return (
    `Layer ${quotedList(labels)} ${many ? "are" : "is"} locked by the host, ` +
    `so neither the host's AI nor anyone else may change ${many ? "them" : "it"}. ` +
    `Ask the host to unlock ${many ? "them" : "it"} in the studio first. Nothing was changed.`
  );
}

type Applied = { design: InvitationDesign; extra?: Record<string, unknown> };
type Refused = { refusal: string };

/**
 * Saves the change the studio's own way: the previous design is kept first as
 * "Before AI: <summary>" (one restore undoes the whole change, inside the 30-version cap),
 * then the new design is saved with the revision that was read, so a change from another tab
 * is never silently overwritten.
 */
async function commitDesignEdit(options: {
  eventId: string;
  before: StoredInvitationDesign;
  next: InvitationDesign;
  summary: string;
  extra?: Record<string, unknown>;
}): Promise<CallToolResult> {
  const { eventId, before, next, summary, extra } = options;

  const short = summary.length > 48 ? `${summary.slice(0, 47)}…` : summary;
  const snapshot = await saveDesignVersionAction(
    eventId,
    `Before AI: ${short}`,
    before.design
  );
  if (!snapshot.ok) {
    return errorResult(
      `Could not keep a backup copy of the card (${snapshot.error}). Nothing was changed.`
    );
  }

  const saved = await saveInvitationDesignAction(
    eventId,
    next,
    before.revision ?? undefined
  );
  if (!saved.ok) {
    return errorResult(
      saved.error.includes("another tab")
        ? `${saved.error} Call get_invitation_design again to read the latest design, then retry the edit.`
        : saved.error
    );
  }

  const layout = checkInvitationLayout(saved.design);
  return dataResult({
    eventId,
    summary,
    revision: saved.revision,
    backup:
      "The card as it was is kept as a version, so restoring that version undoes this whole change.",
    layout: {
      ok: layout.ok,
      counts: layout.counts,
      issues: layout.issues,
      notes: layout.notes,
    },
    ...extra,
  });
}

async function editThrough(
  ctx: ToolContext,
  eventId: string,
  apply: (design: InvitationDesign) => Applied | Refused,
  summarise: (
    next: InvitationDesign,
    applyExtra?: Record<string, unknown>
  ) => {
    summary: string;
    extra?: Record<string, unknown>;
  }
): Promise<CallToolResult> {
  await requireWriteAccess(ctx, eventId);
  const stored = await loadInvitationDesign(ctx, eventId);
  if (!stored) return errorResult(NO_ACCESS);
  const applied = apply(stored.design);
  if ("refusal" in applied) return errorResult(applied.refusal);
  const constrained = constrainEntrySeals(applied.design);
  const { summary, extra } = summarise(constrained, applied.extra);
  return commitDesignEdit({
    eventId,
    before: stored,
    next: constrained,
    summary,
    extra,
  });
}

// ---------------------------------------------------------------------------------------------
// C3: words and styling, by layer id.
// ---------------------------------------------------------------------------------------------

function applyTextEdits(
  design: InvitationDesign,
  edits: EditInvitationTextArgs["edits"]
): Applied | Refused {
  const byId = new Map(design.layers.map((layer) => [layer.id, layer]));
  const ids = [...new Set(edits.map((edit) => edit.layerId))];

  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    return {
      refusal:
        `There is no layer ${quotedList(missing)} on this celebration's card. ` +
        `Call get_invitation_design for the current ids. Nothing was changed.`,
    };
  }
  const locked = ids.map((id) => byId.get(id)!).filter((layer) => layer.locked);
  if (locked.length > 0) return { refusal: lockedRefusal(locked) };

  const sealed = ids
    .map((id) => byId.get(id)!)
    .find((layer) => layer.kind === "code");
  if (sealed) return { refusal: ENTRY_SEAL_REFUSAL };

  const colourWithoutRole = edits.find(
    (edit) =>
      edit.color !== undefined &&
      edit.color !== null &&
      (edit.colorRole ?? byId.get(edit.layerId)!.colorRole) !== "custom"
  );
  if (colourWithoutRole) {
    return {
      refusal:
        `An exact colour needs colorRole "custom" (layer "${colourWithoutRole.layerId}"). ` +
        `Either pass colorRole "custom" with the colour, or pick a palette role instead. Nothing was changed.`,
    };
  }

  return {
    design: {
      ...design,
      layers: design.layers.map((layer) => {
        const edit = edits.find((entry) => entry.layerId === layer.id);
        if (!edit) return layer;
        const next: InvitationLayer = { ...layer };
        if (edit.text !== undefined) next.text = edit.text;
        if (edit.font !== undefined) next.font = edit.font;
        if (edit.size !== undefined) next.size = edit.size;
        if (edit.weight !== undefined) next.weight = edit.weight;
        if (edit.italic !== undefined) next.italic = edit.italic;
        if (edit.textTransform !== undefined)
          next.textTransform = edit.textTransform;
        if (edit.align !== undefined) next.align = edit.align;
        if (edit.colorRole !== undefined) next.colorRole = edit.colorRole;
        if (edit.color !== undefined) next.color = edit.color;
        // An exact colour on its own follows the studio: it becomes a custom colour.
        if (
          edit.color !== undefined &&
          edit.color !== null &&
          edit.colorRole === undefined &&
          layer.colorRole !== "custom"
        ) {
          next.colorRole = "custom";
        }
        if (edit.tracking !== undefined) next.tracking = edit.tracking;
        if (edit.lineHeight !== undefined) next.lineHeight = edit.lineHeight;
        if (edit.textFit !== undefined) next.textFit = edit.textFit;
        return next;
      }),
    },
  };
}

// ---------------------------------------------------------------------------------------------
// C4: move, resize, reorder, add and remove layers.
// ---------------------------------------------------------------------------------------------

function applyLayerEdits(
  design: InvitationDesign,
  args: EditInvitationLayersArgs
): Applied | Refused {
  const moves = args.move ?? [];
  const removals = args.removeLayerIds ?? [];
  if (
    moves.length === 0 &&
    !args.addText &&
    !args.addShape &&
    removals.length === 0
  ) {
    return {
      refusal:
        "Say what to change: move or resize layers, add a text or shape layer, or remove layers. Nothing was changed.",
    };
  }

  const byId = new Map(design.layers.map((layer) => [layer.id, layer]));
  const touched = [...new Set([...moves.map((m) => m.layerId), ...removals])];
  const missing = touched.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    return {
      refusal:
        `There is no layer ${quotedList(missing)} on this celebration's card. ` +
        `Call get_invitation_design for the current ids. Nothing was changed.`,
    };
  }
  const locked = touched
    .map((id) => byId.get(id)!)
    .filter((layer) => layer.locked);
  if (locked.length > 0) return { refusal: lockedRefusal(locked) };

  if (removals.some((id) => byId.get(id)?.kind === "code")) {
    return { refusal: ENTRY_SEAL_REFUSAL };
  }
  const hiddenSeal = moves.find(
    (move) => byId.get(move.layerId)?.kind === "code" && move.opacity === 0
  );
  if (hiddenSeal) return { refusal: ENTRY_SEAL_REFUSAL };

  const adds = (args.addText ? 1 : 0) + (args.addShape ? 1 : 0);
  if (design.layers.length + adds > MAX_LAYERS) {
    return {
      refusal:
        `This card already holds ${design.layers.length} layers, and a card holds at most ${MAX_LAYERS}. ` +
        `Remove a layer first, then add. Nothing was changed.`,
    };
  }

  const moved: InvitationLayer[] = design.layers.map((layer) => {
    const move = moves.find((entry) => entry.layerId === layer.id);
    if (!move) return layer;
    const next: InvitationLayer = { ...layer };
    if (move.x !== undefined) next.x = move.x;
    if (move.y !== undefined) next.y = move.y;
    if (move.width !== undefined) next.width = move.width;
    if (move.height !== undefined) next.height = move.height;
    if (move.rotation !== undefined) next.rotation = move.rotation;
    if (move.opacity !== undefined) next.opacity = move.opacity;
    return next;
  });

  let next: InvitationDesign = { ...design, layers: moved };
  for (const move of moves) {
    if (move.reorder) next = moveLayerStack(next, move.layerId, move.reorder);
  }

  const addedIds: string[] = [];
  if (args.addText) {
    const layer = createLayerOfKind(args.addText.kind, next.layers.length);
    if (args.addText.text !== undefined) {
      layer.text = args.addText.text;
      layer.visible = args.addText.text.trim().length > 0;
    }
    next = { ...next, layers: [...next.layers, layer] };
    addedIds.push(layer.id);
  }
  if (args.addShape) {
    const layer = createShapeLayer(
      args.addShape.shape,
      next.layers.length,
      next.canvas?.ratio
    );
    if (args.addShape.fill !== undefined) layer.fill = args.addShape.fill;
    next = { ...next, layers: [...next.layers, layer] };
    addedIds.push(layer.id);
  }
  if (removals.length > 0) {
    const gone = new Set(removals);
    next = {
      ...next,
      layers: next.layers.filter((layer) => !gone.has(layer.id)),
    };
  }

  return { design: next, extra: { addedIds } };
}

// ---------------------------------------------------------------------------------------------
// C5: theme, layout preset or canvas shape — the studio's own functions, so the same result.
// ---------------------------------------------------------------------------------------------

const CANVAS_SHAPES = {
  portrait_5_7: 5 / 7,
  standard_4_5: 4 / 5,
  square_1_1: 1,
  story_9_16: 9 / 16,
  landscape_7_5: 7 / 5,
  a5_fine_art: 1200 / 1700,
} as const;

function applyLook(
  design: InvitationDesign,
  args: ApplyInvitationLookArgs
): Applied | Refused {
  if (!args.theme && !args.layoutPreset && !args.canvasPreset) {
    return {
      refusal:
        "Choose at least one of theme, layoutPreset or canvasPreset. Nothing was changed.",
    };
  }
  let next = design;
  if (args.theme) next = applyInvitationTheme(next, args.theme);
  if (args.layoutPreset) next = applyLayoutPreset(next, args.layoutPreset);
  if (args.canvasPreset) {
    const ratio = CANVAS_SHAPES[args.canvasPreset];
    const preset = CANVAS_PRESETS.find(
      (entry) => Math.abs(entry.ratio - ratio) < 1e-6
    );
    if (preset) next = resizeCanvasPx(next, preset.widthPx, preset.heightPx);
  }
  return { design: next };
}

// ---------------------------------------------------------------------------------------------
// C6: brand styles — create one, put it on layers, or rewrite it from a layer.
// ---------------------------------------------------------------------------------------------

function applyStyleEdits(
  design: InvitationDesign,
  args: EditInvitationStylesArgs
): Applied | Refused {
  const wantsCreate =
    args.createFromLayerId !== undefined || args.createName !== undefined;
  const wantsApply =
    args.applyStyleId !== undefined || (args.applyLayerIds?.length ?? 0) > 0;
  const wantsUpdate =
    args.updateStyleId !== undefined || args.updateFromLayerId !== undefined;
  if (!wantsCreate && !wantsApply && !wantsUpdate) {
    return {
      refusal:
        "Say what to do: create a style from a layer (createFromLayerId and createName), put a style on layers (applyStyleId and applyLayerIds), or rewrite a style from a layer (updateStyleId and updateFromLayerId). Nothing was changed.",
    };
  }
  if (wantsCreate && (!args.createFromLayerId || !args.createName)) {
    return {
      refusal:
        "Creating a style needs both the layer to copy (createFromLayerId) and a name (createName). Nothing was changed.",
    };
  }
  if (
    wantsApply &&
    (!args.applyStyleId || (args.applyLayerIds?.length ?? 0) === 0)
  ) {
    return {
      refusal:
        "Putting a style on layers needs both the style (applyStyleId) and the layers (applyLayerIds). Nothing was changed.",
    };
  }
  if (wantsUpdate && (!args.updateStyleId || !args.updateFromLayerId)) {
    return {
      refusal:
        "Rewriting a style needs both the style (updateStyleId) and the layer whose look it should take (updateFromLayerId). Nothing was changed.",
    };
  }

  const byId = new Map(design.layers.map((layer) => [layer.id, layer]));
  const layerIds = [
    args.createFromLayerId,
    ...(args.applyLayerIds ?? []),
    args.updateFromLayerId,
  ].filter((id): id is string => id !== undefined);
  const missing = [...new Set(layerIds)].filter((id) => !byId.has(id));
  if (missing.length > 0) {
    return {
      refusal:
        `There is no layer ${quotedList(missing)} on this celebration's card. ` +
        `Call get_invitation_design for the current ids. Nothing was changed.`,
    };
  }
  for (const styleId of [args.applyStyleId, args.updateStyleId].filter(
    (id): id is string => id !== undefined
  )) {
    if (!design.textStyles?.some((style) => style.id === styleId)) {
      return {
        refusal:
          `There is no brand style "${styleId}" on this card. ` +
          `Call get_invitation_design for the current styles. Nothing was changed.`,
      };
    }
  }

  // A style edit must never move a locked layer: creating tags the source, applying rewrites
  // the targets, and updating rewrites every layer that follows the style.
  const changedByCreate = args.createFromLayerId
    ? [byId.get(args.createFromLayerId)!]
    : [];
  const changedByApply = (args.applyLayerIds ?? []).map((id) => byId.get(id)!);
  const changedByUpdate = args.updateStyleId
    ? design.layers.filter((layer) => layer.styleId === args.updateStyleId)
    : [];
  const locked = [
    ...changedByCreate,
    ...changedByApply,
    ...changedByUpdate,
  ].filter((layer) => layer.locked);
  if (locked.length > 0) return { refusal: lockedRefusal(locked) };

  if (wantsCreate && (design.textStyles?.length ?? 0) >= MAX_TEXT_STYLES) {
    return {
      refusal: `This card already holds ${MAX_TEXT_STYLES} brand styles, the most a card keeps. Nothing was changed.`,
    };
  }

  let next = design;
  let createdStyleId: string | undefined;
  if (args.createFromLayerId && args.createName) {
    createdStyleId = `style-${Date.now().toString(36)}-${next.layers.length}`;
    next = createTextStyle(
      next,
      args.createFromLayerId,
      args.createName,
      createdStyleId
    );
  }
  if (args.applyStyleId && args.applyLayerIds?.length) {
    next = applyTextStyle(next, args.applyLayerIds, args.applyStyleId);
  }
  if (args.updateStyleId && args.updateFromLayerId) {
    next = updateTextStyle(next, args.updateStyleId, args.updateFromLayerId);
  }
  return {
    design: next,
    extra: createdStyleId ? { createdStyleId } : undefined,
  };
}

// ---------------------------------------------------------------------------------------------
// C7: the whole card at once, validated field by field.
// ---------------------------------------------------------------------------------------------

function applyReplacement(
  design: InvitationDesign,
  args: ReplaceInvitationDesignArgs
): Applied | Refused {
  void design;
  const parsed = invitationDesignSchema.safeParse(args.design);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (issue) => `- ${issue.path.join(".") || "(design)"}: ${issue.message}`
    );
    return {
      refusal:
        `That design is not valid (${parsed.error.issues.length} problem${parsed.error.issues.length === 1 ? "" : "s"}). ` +
        `Fix these and try again; paths are in the card's own terms:\n${lines.join("\n")}\nNothing was changed.`,
    };
  }
  return { design: constrainEntrySeals(ensureEntrySeal(parsed.data)) };
}

// ---------------------------------------------------------------------------------------------

export function registerDesignEditTools(
  server: McpServer,
  ctx: ToolContext
): void {
  server.registerTool(
    "edit_invitation_text",
    {
      title: "Edit invitation words and styling",
      description: `Changes the words and styling of invitation card layers by layer id — words, font, size, weight, italic, case, alignment, colour role or exact colour, letter spacing, line height and fit — several layers in one call. Fields left out keep their stored value. Locked layers and the entry seal are refused. Call get_invitation_design first for the ids, and check_invitation_layout afterwards for what the change broke. ${DESIGN_TEXT_NOTE}`,
      inputSchema: editInvitationTextInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (args) =>
      runTool(
        ctx,
        "edit_invitation_text",
        { eventId: args.eventId, note: "Edited invitation text" },
        () =>
          editThrough(
            ctx,
            args.eventId,
            (design) => applyTextEdits(design, args.edits),
            (next) => {
              const labels = [
                ...new Set(
                  args.edits.map(
                    (edit) =>
                      next.layers
                        .find((layer) => layer.id === edit.layerId)
                        ?.name?.trim() || edit.layerId
                  )
                ),
              ];
              return {
                summary: `changed text on ${quotedList(labels)}`,
                extra: {
                  editedLayerIds: args.edits.map((edit) => edit.layerId),
                },
              };
            }
          )
      )
  );

  server.registerTool(
    "edit_invitation_layers",
    {
      title: "Move, add, reorder and remove layers",
      description: `Moves and resizes invitation card layers (position, box, rotation, opacity), reorders them through the stack, adds one text, seal, divider or shape layer, and removes layers — in one call. The entry seal can never be removed or hidden, locked layers are refused, and a card holds at most 60 layers. Call get_invitation_design first for the ids and the free space, and check_invitation_layout afterwards for what the change broke. ${DESIGN_TEXT_NOTE}`,
      inputSchema: editInvitationLayersInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    (args) =>
      runTool(
        ctx,
        "edit_invitation_layers",
        { eventId: args.eventId, note: "Edited invitation layers" },
        () =>
          editThrough(
            ctx,
            args.eventId,
            (design) => applyLayerEdits(design, args),
            (_next, applyExtra) => {
              const parts: string[] = [];
              if (args.move?.length) {
                parts.push(
                  `moved ${quotedList([...new Set(args.move.map((move) => move.layerId))])}`
                );
              }
              if (args.addText)
                parts.push(`added a ${args.addText.kind} layer`);
              if (args.addShape)
                parts.push(`added a ${args.addShape.shape} shape`);
              if (args.removeLayerIds?.length)
                parts.push(`removed ${quotedList(args.removeLayerIds)}`);
              return {
                summary: parts.join(", ") || "edited layers",
                extra: applyExtra,
              };
            }
          )
      )
  );

  server.registerTool(
    "apply_invitation_look",
    {
      title: "Apply a theme, layout preset or canvas shape",
      description: `Recolours the invitation card with a theme palette, rebuilds it in a layout preset arrangement keeping the host's words, or reshapes the canvas — the same result as the studio's own buttons. A layout preset replaces the arrangement but keeps the words and the entry seal. Call get_invitation_design first for what the card looks like now, and check_invitation_layout afterwards for what the change broke. ${DESIGN_TEXT_NOTE}`,
      inputSchema: applyInvitationLookInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (args) =>
      runTool(
        ctx,
        "apply_invitation_look",
        { eventId: args.eventId, note: "Applied invitation look" },
        () =>
          editThrough(
            ctx,
            args.eventId,
            (design) => applyLook(design, args),
            () => {
              const parts: string[] = [];
              if (args.theme)
                parts.push(
                  `applied the ${INVITATION_THEME_LABELS[args.theme]} theme`
                );
              if (args.layoutPreset)
                parts.push(
                  `applied the ${presetName(args.layoutPreset)} layout`
                );
              if (args.canvasPreset)
                parts.push(`reshaped the canvas to ${args.canvasPreset}`);
              return { summary: parts.join(", ") || "applied a look" };
            }
          )
      )
  );

  server.registerTool(
    "edit_invitation_styles",
    {
      title: "Create, apply and update brand styles",
      description: `Manages the invitation card's brand styles: save a text layer's look as a new named style, put a style on layers so they follow it, or rewrite a style from a layer so every layer following it changes too — the same result as the studio. Locked layers are refused. Call get_invitation_design first for the styles and ids, and check_invitation_layout afterwards for what the change broke. ${DESIGN_TEXT_NOTE}`,
      inputSchema: editInvitationStylesInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    (args) =>
      runTool(
        ctx,
        "edit_invitation_styles",
        { eventId: args.eventId, note: "Edited invitation brand styles" },
        () =>
          editThrough(
            ctx,
            args.eventId,
            (design) => applyStyleEdits(design, args),
            (_next, applyExtra) => {
              const parts: string[] = [];
              if (args.createName)
                parts.push(`created brand style "${args.createName}"`);
              if (args.applyStyleId)
                parts.push(
                  `put style "${args.applyStyleId}" on ${args.applyLayerIds?.length ?? 0} layers`
                );
              if (args.updateStyleId)
                parts.push(`rewrote style "${args.updateStyleId}"`);
              return {
                summary: parts.join(", ") || "edited brand styles",
                extra: applyExtra,
              };
            }
          )
      )
  );

  server.registerTool(
    "replace_invitation_design",
    {
      title: "Replace the whole invitation design",
      description: `Replaces the entire invitation card with a complete design at once, for "design me a card in emerald and gold". The design is validated against the same schema the studio saves with; an invalid design is refused with the exact fields that failed, and nothing is changed. Replaces everything except the entry seal, which is kept; the previous card stays one restore away. Prefer the smaller edit tools when only a few layers need changing. ${DESIGN_TEXT_NOTE}`,
      inputSchema: replaceInvitationDesignInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    (args) =>
      runTool(
        ctx,
        "replace_invitation_design",
        { eventId: args.eventId, note: "Replaced invitation design" },
        () =>
          editThrough(
            ctx,
            args.eventId,
            (design) => applyReplacement(design, args),
            () => ({ summary: "replaced the whole design" })
          )
      )
  );
}
