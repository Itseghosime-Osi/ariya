import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TeamDeskData, TeamMember, TeamInvite, EventRole } from "./types";

export async function getTeamDeskData(
  eventId: string
): Promise<TeamDeskData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Fetch event members
  const { data: rawMembers, error: membersError } = await supabase
    .from("event_members")
    .select(
      `
      id,
      event_id,
      user_id,
      role,
      created_at,
      profiles (
        full_name,
        email
      )
    `
    )
    .eq("event_id", eventId);

  if (membersError || !rawMembers) return null;

  let currentUserRole: EventRole | null = null;

  const members: TeamMember[] = rawMembers.map((m) => {
    const profile = m.profiles as {
      full_name?: string | null;
      email?: string | null;
    } | null;
    const role = m.role as EventRole;
    const isCurrentUser = m.user_id === user.id;

    if (isCurrentUser) {
      currentUserRole = role;
    }

    return {
      id: m.id,
      eventId: m.event_id,
      userId: m.user_id,
      role,
      createdAt: m.created_at,
      email: profile?.email || "Member",
      fullName: profile?.full_name || profile?.email || "Team Member",
      isCurrentUser,
    };
  });

  if (!currentUserRole) return null;

  // 2. Fetch pending invites (visible to owners and planners)
  let invites: TeamInvite[] = [];
  const canManageMembers =
    currentUserRole === "owner" || currentUserRole === "planner";
  const canManageOwners = currentUserRole === "owner";

  if (canManageMembers) {
    const { data: rawInvites } = await supabase
      .from("event_invites")
      .select("*")
      .eq("event_id", eventId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    if (rawInvites) {
      const now = new Date().getTime();
      invites = rawInvites.map((inv) => ({
        id: inv.id,
        eventId: inv.event_id,
        email: inv.email,
        role: inv.role as EventRole,
        token: inv.token,
        expiresAt: inv.expires_at,
        createdAt: inv.created_at,
        isExpired: new Date(inv.expires_at).getTime() < now,
      }));
    }
  }

  return {
    members,
    invites,
    currentUserRole,
    canManageMembers,
    canManageOwners,
  };
}

export async function getTeamInviteByToken(token: string) {
  const cleanToken = token.trim();
  if (!cleanToken || cleanToken.length < 10) return null;

  const supabase = createAdminClient();
  const { data: invite } = await supabase
    .from("event_invites")
    .select(
      `
      id,
      event_id,
      email,
      role,
      token,
      expires_at,
      accepted_at,
      events (
        title,
        couple
      )
    `
    )
    .eq("token", token)
    .maybeSingle();

  if (!invite) return null;

  const eventData = invite.events as {
    title?: string | null;
    couple?: string | null;
  } | null;

  const isExpired = new Date(invite.expires_at).getTime() < Date.now();
  const isAccepted = !!invite.accepted_at;

  return {
    ...invite,
    eventTitle: eventData?.title || "Celebration",
    coupleName: eventData?.couple || "Host Couple",
    isExpired,
    isAccepted,
  };
}
