import { z } from "zod";

export const invitationGuestSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  display_name: z.string(),
  party_size: z.number(),
  plus_ones_allowed: z.boolean(),
});

export const invitationRsvpSchema = z.object({
  status: z.enum(["pending", "accepted", "declined"]),
  attending_count: z.number(),
  plus_one_name: z.string().nullable(),
  dietary: z.string().nullable(),
  note: z.string().nullable(),
  responded_at: z.string().nullable(),
});

export const invitationEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  couple: z.string(),
  date: z.string(),
  venue: z.string(),
  area: z.string().nullable(),
  dress_code: z.string().nullable(),
  rsvp_by: z.string().nullable(),
  status: z.string(),
});

export const invitationDataSchema = z.object({
  guest: invitationGuestSchema,
  rsvp: invitationRsvpSchema.nullable(),
  event: invitationEventSchema,
  table_name: z.string().nullable().optional().default(null),
});

export type ParsedInvitationData = z.infer<typeof invitationDataSchema>;

export const contactEmailSchema = z
  .string()
  .trim()
  .email("Please provide a valid email address.")
  .max(254, "Email address is too long.");

export const submitRsvpRpcResultSchema = z.object({
  ok: z.boolean(),
  rsvp: z.record(z.string(), z.unknown()).optional(),
  email_delivery: z
    .object({
      target_email: z.string().nullable().optional(),
      was_on_file: z.boolean().optional(),
      can_send: z.boolean().optional(),
    })
    .optional(),
});
