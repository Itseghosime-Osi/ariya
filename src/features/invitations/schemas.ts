import { z } from "zod";
import { INVITATION_LAYER_KINDS, INVITATION_THEMES } from "./types";

const hexColour = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex colour");

const imageUrl = z
  .string()
  .trim()
  .max(2048)
  .url("Use a full image link")
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "Image links must start with http or https",
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
  x: z.number().finite().min(0).max(100),
  y: z.number().finite().min(0).max(100),
  width: z.number().finite().min(5).max(100),
  align: z.enum(["left", "center", "right"]),
  font: z.enum(["display", "sans"]),
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
});

export const invitationDesignSchema = z.object({
  version: z.literal(1),
  theme: z.enum(INVITATION_THEMES),
  palette: invitationPaletteSchema,
  background: z.object({
    kind: z.enum(["paper", "velvet", "image"]),
    imageUrl: imageUrl.nullable(),
    overlay: z.number().finite().min(0).max(0.9),
  }),
  layers: z.array(invitationLayerSchema).min(1).max(24),
});

export type InvitationDesignInput = z.infer<typeof invitationDesignSchema>;

export const trackInvitationsSchema = z.object({
  guestIds: z.array(z.guid("Invalid guest ID")).min(1),
});

export type TrackInvitationsInput = z.infer<typeof trackInvitationsSchema>;
