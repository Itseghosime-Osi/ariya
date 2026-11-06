/**
 * Who may open an invitation. A live invitation opens for everyone. In test mode only the
 * celebration's own team can open it, so a host can watch the film and try the page without a
 * single guest seeing it early.
 */
export type InviteAccess = "open" | "test-preview" | "not-live";

export function inviteAccess(options: {
  live: boolean;
  isTeamMember: boolean;
}): InviteAccess {
  if (options.live) return "open";
  return options.isTeamMember ? "test-preview" : "not-live";
}
