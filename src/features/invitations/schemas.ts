import { z } from "zod";

export const invitationThemeEnum = z.enum([
  "royal_gold",
  "emerald_regal",
  "sunset_asoebi",
  "monochrome_velvet",
]);

export const invitationDesignSchema = z.object({
  theme: invitationThemeEnum.default("royal_gold"),
  headline: z.string().min(1, "Headline is required").max(100),
  subheadline: z.string().max(200).optional(),
  attireNote: z.string().max(150).optional(),
  customMessage: z.string().max(500).optional(),
});

export type InvitationDesignInput = z.infer<typeof invitationDesignSchema>;

export const trackInvitationsSchema = z.object({
  guestIds: z.array(z.string().uuid("Invalid guest ID")).min(1),
});

export type TrackInvitationsInput = z.infer<typeof trackInvitationsSchema>;
