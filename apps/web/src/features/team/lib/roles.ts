import type { IconName } from "@/components/ui/icon";
import type { EventRole } from "../types";

export interface RoleMeta {
  label: string;
  short: string;
  blurb: string;
  ink: string;
  wash: string;
  icon: IconName;
  permissions: string[];
}

export const ROLE_ORDER: EventRole[] = ["owner", "planner", "couple", "staff"];

export const ROLE_META: Record<EventRole, RoleMeta> = {
  owner: {
    label: "Owner",
    short: "Owner",
    blurb: "Holds the celebration: billing, access and every decision.",
    ink: "#7a5612",
    wash: "#f3e9d6",
    icon: "verified",
    permissions: [
      "Everything, including billing and receipts",
      "Invite anyone and change any role",
      "Remove members and pending invites",
    ],
  },
  planner: {
    label: "Lead Planner",
    short: "Planner",
    blurb: "Runs the day-to-day: guests, seating, vendors and reminders.",
    ink: "#3b5b8a",
    wash: "#e3ecf4",
    icon: "calendar",
    permissions: [
      "Manage guests, seating, vendors and reminders",
      "Invite couple and staff members",
      "No billing access",
    ],
  },
  couple: {
    label: "Celebrant Couple",
    short: "Couple",
    blurb: "Sees the whole plan and weighs in, without changing it.",
    ink: "#6b1e2e",
    wash: "#f6e3e6",
    icon: "celebration",
    permissions: [
      "View the overview, guests and seating",
      "Read guest replies and the guestbook",
      "Read-only: no edits or billing",
    ],
  },
  staff: {
    label: "Event Staff",
    short: "Staff",
    blurb: "Works the door: check-in desk and invitation scanning on the day.",
    ink: "#5a474e",
    wash: "#f2ede4",
    icon: "qr_code_scanner",
    permissions: [
      "Check guests in and scan invitation codes",
      "See the guest list for the door",
      "No billing, no edits to the plan",
    ],
  },
};

export function roleMeta(role: EventRole): RoleMeta {
  return ROLE_META[role] ?? ROLE_META.staff;
}

export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => /\p{L}/u.test(part));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return Array.from(parts[0])[0].toUpperCase();
  return (
    Array.from(parts[0])[0] + Array.from(parts[parts.length - 1])[0]
  ).toUpperCase();
}
