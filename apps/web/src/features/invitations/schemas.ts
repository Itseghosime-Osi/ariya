import { z } from "zod";
import {
  INVITATION_FONTS,
  INVITATION_LAYER_KINDS,
  INVITATION_SHAPES,
  INVITATION_THEMES,
} from "./types";

const hexColour = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex colour");

const imageUrl = z
  .string()
  .trim()
  .max(100_000)
  .refine((value) => /^(https?:\/\/|data:image\/|blob:)/i.test(value), {
    message: "Image links must start with http, https, data:image, or blob",
  });

export const invitationPaletteSchema = z.object({
  paper: hexColour,
  paperEdge: hexColour,
  ink: hexColour,
  title: hexColour,
  body: hexColour,
  accent: hexColour,
  foil: hexColour,
  ribbonA: hexColour,
  ribbonB: hexColour,
  stageFrom: hexColour,
  stageTo: hexColour,
});

export const invitationLayerSchema = z.object({
  id: z.string().min(1).max(48),
  kind: z.enum(INVITATION_LAYER_KINDS),
  text: z.string().max(600),
  x: z.number().finite().min(-500).max(500),
  y: z.number().finite().min(-500).max(500),
  width: z.number().finite().min(1).max(1000),
  align: z.enum(["left", "center", "right"]),
  font: z.enum(INVITATION_FONTS),
  size: z.number().finite().min(1).max(20),
  weight: z.union([
    z.literal(400),
    z.literal(500),
    z.literal(600),
    z.literal(700),
  ]),
  italic: z.boolean(),
  tracking: z.number().finite().min(0).max(1),
  colorRole: z.enum(["ink", "title", "body", "accent", "foil", "custom"]),
  color: hexColour.nullable(),
  visible: z.boolean(),
  name: z.string().trim().max(60).optional(),
  height: z.number().finite().min(0.2).max(1000).optional(),
  rotation: z.number().finite().min(-360).max(360).optional(),
  opacity: z.number().finite().min(0).max(1).optional(),
  fill: hexColour.nullable().optional(),
  stroke: hexColour.nullable().optional(),
  strokeWidth: z.number().finite().min(0).max(100).optional(),
  radius: z.number().finite().min(0).max(2000).optional(),
  shape: z.enum(INVITATION_SHAPES).optional(),
  imageUrl: imageUrl.nullable().optional(),
  fit: z.enum(["cover", "contain"]).optional(),
  maskShape: z.enum(INVITATION_SHAPES).optional(),
  focalX: z.number().finite().min(-500).max(500).optional(),
  focalY: z.number().finite().min(-500).max(500).optional(),
  lineHeight: z.number().finite().min(0.5).max(10).optional(),
  textTransform: z
    .enum(["none", "uppercase", "lowercase", "capitalize"])
    .optional(),
  shadow: z.enum(["none", "soft", "foil", "glow"]).optional(),
  blendMode: z.string().trim().max(40).optional(),
  blur: z.number().finite().min(0).max(500).optional(),
  gradient: z.string().trim().max(300).optional(),
  radiusTL: z.number().finite().min(0).max(2000).optional(),
  radiusTR: z.number().finite().min(0).max(2000).optional(),
  radiusBR: z.number().finite().min(0).max(2000).optional(),
  radiusBL: z.number().finite().min(0).max(2000).optional(),
  brightness: z.number().finite().min(-500).max(500).optional(),
  contrast: z.number().finite().min(-500).max(500).optional(),
  saturate: z.number().finite().min(-500).max(500).optional(),
  sepia: z.number().finite().min(0).max(500).optional(),
  grayscale: z.number().finite().min(0).max(500).optional(),
  shadowBlur: z.number().finite().min(0).max(500).optional(),
  shadowX: z.number().finite().min(-1000).max(1000).optional(),
  shadowY: z.number().finite().min(-1000).max(1000).optional(),
  shadowColor: hexColour.nullable().optional(),
  groupId: z.string().trim().max(60).optional(),
  locked: z.boolean().optional(),
  aspectLocked: z.boolean().optional(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
});

export const invitationDesignSchema = z.object({
  version: z.literal(1),
  canvas: z
    .object({
      ratio: z.number().finite().min(0.4).max(2.5),
      widthPx: z.number().int().min(200).max(10000).optional(),
      heightPx: z.number().int().min(200).max(10000).optional(),
      edgeStyle: z.enum(["sharp", "rounded", "deckled"]).optional(),
      cornerRadiusPx: z.number().finite().min(0).max(500).optional(),
    })
    .optional(),
  chrome: z.boolean().optional(),
  theme: z.enum(INVITATION_THEMES),
  palette: invitationPaletteSchema,
  background: z.object({
    kind: z.enum(["paper", "velvet", "image", "color"]),
    color: hexColour.nullable().optional(),
    imageUrl: imageUrl.nullable(),
    overlay: z.number().finite().min(0).max(0.9),
  }),
  layers: z
    .array(invitationLayerSchema)
    .max(60)
    .superRefine((layers, ctx) => {
      if (new Set(layers.map((layer) => layer.id)).size !== layers.length)
        ctx.addIssue({
          code: "custom",
          message: "Every layer must have a unique identifier.",
        });
      if (layers.filter((layer) => layer.kind === "code").length > 1)
        ctx.addIssue({
          code: "custom",
          message: "An invitation can contain only one guest entry seal.",
        });
    }),
});

export type InvitationDesignInput = z.infer<typeof invitationDesignSchema>;

export const trackInvitationsSchema = z.object({
  guestIds: z.array(z.guid("Invalid guest ID")).min(1),
});

export type TrackInvitationsInput = z.infer<typeof trackInvitationsSchema>;
