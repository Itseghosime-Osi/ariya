"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapError } from "@/lib/errors";
import {
  inviteTeamMemberSchema,
  updateTeamMemberRoleSchema,
  removeTeamMemberSchema,
} from "./schemas";

export interface TeamActionState {
  error?: string;
  success?: boolean;
}

export async function inviteTeamMemberAction(
  eventId: string,
  _prevState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const parsed = inviteTeamMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid invitation details",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_team_member", {
    p_event_id: eventId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });

  if (error) {
    return { error: mapError(error) };
  }

  revalidatePath(`/events/${eventId}/team`);
  return { success: true };
}

export async function updateTeamMemberRoleAction(
  eventId: string,
  formData: FormData
): Promise<TeamActionState> {
  const parsed = updateTeamMemberRoleSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
    newRole: formData.get("newRole"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid role update" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_team_member_role", {
    p_event_id: eventId,
    p_target_user_id: parsed.data.targetUserId,
    p_new_role: parsed.data.newRole,
  });

  if (error) {
    return { error: mapError(error) };
  }

  revalidatePath(`/events/${eventId}/team`);
  return { success: true };
}

export async function removeTeamMemberAction(
  eventId: string,
  formData: FormData
): Promise<TeamActionState> {
  const parsed = removeTeamMemberSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid member ID" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_team_member", {
    p_event_id: eventId,
    p_target_user_id: parsed.data.targetUserId,
  });

  if (error) {
    return { error: mapError(error) };
  }

  revalidatePath(`/events/${eventId}/team`);
  return { success: true };
}

export async function cancelTeamInviteAction(
  eventId: string,
  inviteId: string
): Promise<TeamActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_invites")
    .delete()
    .eq("id", inviteId)
    .eq("event_id", eventId);

  if (error) {
    return { error: mapError(error) };
  }

  revalidatePath(`/events/${eventId}/team`);
  return { success: true };
}

export async function acceptTeamInviteAction(
  token: string
): Promise<{ error?: string; eventId?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_team_invite", {
    p_token: token,
  });

  if (error || !data) {
    return { error: mapError(error) };
  }

  const res = data as { event_id: string; role: string };
  redirect(`/events/${res.event_id}`);
}
