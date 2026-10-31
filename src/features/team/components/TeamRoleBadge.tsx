import React from "react";
import { Icon } from "@/components/ui/icon";
import type { EventRole } from "../types";
import { roleMeta } from "../lib/roles";

interface TeamRoleBadgeProps {
  role: EventRole;
  className?: string;
}

/** The role as a tinted pill. Colour is never the only signal: the icon and the word come with it. */
export function TeamRoleBadge({ role, className = "" }: TeamRoleBadgeProps) {
  const meta = roleMeta(role);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}
      style={{ backgroundColor: meta.wash, color: meta.ink }}
    >
      <Icon name={meta.icon} size={12} />
      <span>{meta.label}</span>
    </span>
  );
}
