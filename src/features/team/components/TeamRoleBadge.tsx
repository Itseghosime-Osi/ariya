import React from "react";
import { Icon } from "@/components/ui/icon";
import type { EventRole } from "../types";

const ROLE_CONFIG: Record<
  EventRole,
  { label: string; icon: string; badgeClass: string }
> = {
  owner: {
    label: "Owner",
    icon: "crown",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
  },
  planner: {
    label: "Lead Planner",
    icon: "event_note",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-300",
  },
  couple: {
    label: "Celebrant Couple",
    icon: "favorite",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
  },
  staff: {
    label: "Event Staff",
    icon: "badge",
    badgeClass: "bg-stone-100 text-stone-800 border-stone-300",
  },
};

interface TeamRoleBadgeProps {
  role: EventRole;
  className?: string;
}

export function TeamRoleBadge({ role, className = "" }: TeamRoleBadgeProps) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.staff;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.badgeClass} ${className}`}
    >
      <Icon name={config.icon} className="text-xs" />
      <span>{config.label}</span>
    </span>
  );
}
