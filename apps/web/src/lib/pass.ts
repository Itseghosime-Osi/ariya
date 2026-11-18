/**
 * What the Celebration Pass unlocks, in one place. The pricing page, the billing card and every
 * "Unlock with the Celebration Pass" prompt read this list, so they can never promise different
 * things. The database enforces the same lines (see migration 20261117000000_celebration_pass_features).
 */
export type PassFeature =
  "invitations" | "check-in" | "team" | "hall-3d" | "import" | "ai";

export const PASS_FEATURES: Record<
  PassFeature,
  { title: string; short: string; why: string }
> = {
  invitations: {
    title: "Unlimited guest invitations and reminders",
    short: "Unlimited invitations",
    why: "Send every invitation and reminder you need, past the first 50.",
  },
  "check-in": {
    title: "The door check-in desk, with ushers and offline mode",
    short: "Door check-in",
    why: "Scan passes at the door, find guests by name, and keep going with no signal.",
  },
  team: {
    title: "Team access for planners, family and ushers",
    short: "Team access",
    why: "Invite your planner, family and ushers to help run the celebration.",
  },
  "hall-3d": {
    title: "The 3D hall, floor-plan PDF and print exports",
    short: "3D hall & print",
    why: "Walk the hall in 3D, share the floor plan, and print it to scale.",
  },
  import: {
    title: "Guest-list import from a spreadsheet or your contacts",
    short: "Guest import",
    why: "Bring in hundreds of guests at once instead of typing them one by one.",
  },
  ai: {
    title: "Connect your AI assistant",
    short: "AI assistant",
    why: "Let your AI assistant read and help plan this celebration.",
  },
};

export const PASS_FEATURE_ORDER: PassFeature[] = [
  "invitations",
  "check-in",
  "team",
  "hall-3d",
  "import",
  "ai",
];

/** The hint the database raises when a pass-only action is tried without the pass. */
export const PASS_REQUIRED_HINT = "PASS_REQUIRED";

export const passRequiredMessage = (feature: PassFeature) =>
  `${PASS_FEATURES[feature].short} comes with the Celebration Pass. Open Billing to unlock it for this celebration.`;

export function billingHref(eventId: string) {
  return `/events/${eventId}/billing`;
}
