export type EventRole = "owner" | "planner" | "couple" | "staff";

export interface TeamMember {
  id: string;
  eventId: string;
  userId: string;
  role: EventRole;
  createdAt: string;
  email: string;
  fullName: string;
  isCurrentUser?: boolean;
}

export interface TeamInvite {
  id: string;
  eventId: string;
  email: string;
  role: EventRole;
  token: string;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
}

export interface TeamDeskData {
  members: TeamMember[];
  invites: TeamInvite[];
  currentUserRole: EventRole;
  canManageMembers: boolean;
  canManageOwners: boolean;
}
