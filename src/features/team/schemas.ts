import { z } from "zod";

export const eventRoleEnum = z.enum(["owner", "planner", "couple", "staff"]);

export const inviteTeamMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("A valid email address is required")
    .max(254, "Email exceeds maximum allowable length"),
  role: eventRoleEnum,
});

export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;

export const updateTeamMemberRoleSchema = z.object({
  targetUserId: z.guid("Invalid user ID"),
  newRole: eventRoleEnum,
});

export type UpdateTeamMemberRoleInput = z.infer<
  typeof updateTeamMemberRoleSchema
>;

export const removeTeamMemberSchema = z.object({
  targetUserId: z.guid("Invalid user ID"),
});

export type RemoveTeamMemberInput = z.infer<typeof removeTeamMemberSchema>;

export const acceptTeamInviteSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
});

export type AcceptTeamInviteInput = z.infer<typeof acceptTeamInviteSchema>;
