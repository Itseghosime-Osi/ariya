"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatLagosDate, getLagosDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SwitcherEvent } from "./nav-items";

interface EventSwitcherProps {
  events: SwitcherEvent[];
  activeEvent: SwitcherEvent | null;
  onSelectEvent: (eventId: string) => void;
  /** "velvet" sits on the dark sidebar; "light" on glass surfaces. */
  tone?: "light" | "velvet";
  /** Folded sidebar: just the event's initial, named for screen readers. */
  compact?: boolean;
}

function formatShortDate(dateInput: string | null | undefined): string {
  if (!dateInput || !getLagosDateKey(dateInput)) return "Date not set";
  return `${formatLagosDate(dateInput, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} WAT`;
}

export function EventSwitcher({
  events,
  activeEvent,
  onSelectEvent,
  tone = "light",
  compact = false,
}: EventSwitcherProps) {
  const velvet = tone === "velvet";

  if (!activeEvent && events.length === 0) {
    return (
      <div
        data-testid="event-switcher-empty"
        aria-disabled="true"
        aria-label={compact ? "Create your first event" : undefined}
        className={cn(
          "flex min-h-[44px] items-center gap-2.5 rounded-2xl border text-xs font-medium select-none",
          compact ? "w-11 justify-center" : "px-3.5 py-2.5",
          velvet
            ? "border-ivory/10 bg-ivory/[0.04] text-ivory/70"
            : "border-hairline bg-white/55 text-label-2"
        )}
      >
        <Icon
          name="celebration"
          size={16}
          className={cn("shrink-0", velvet ? "text-gold/70" : "text-label-3")}
        />
        {!compact && <span className="truncate">Create your first event</span>}
      </div>
    );
  }

  const current = activeEvent ?? events[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="event-switcher-trigger"
          aria-label={
            compact ? `Switch celebration: ${current.title}` : undefined
          }
          className={cn(
            "flex min-h-[48px] items-center gap-2.5 rounded-2xl border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
            compact
              ? "h-11 min-h-[44px] w-11 justify-center"
              : "w-full justify-between px-3.5 py-2",
            velvet
              ? "border-gold/20 bg-ivory/[0.06] hover:bg-ivory/[0.1] focus-visible:outline-gold"
              : "border-hairline bg-white/85 hover:bg-white shadow-2xs focus-visible:outline-burgundy"
          )}
        >
          {compact ? (
            <span
              aria-hidden="true"
              className="font-display text-base font-bold text-gold"
            >
              {current.title.trim().charAt(0).toUpperCase() || "À"}
            </span>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <p
                  data-testid="event-switcher-current-title"
                  className={cn(
                    "truncate text-xs font-semibold",
                    velvet ? "text-ivory" : "text-night"
                  )}
                >
                  {current.title}
                </p>
                <p
                  className={cn(
                    "truncate text-[11px] tabular-nums",
                    velvet ? "text-ivory/65" : "text-label-2"
                  )}
                >
                  {formatShortDate(current.date)}
                </p>
              </div>
              <Icon
                name="expand_more"
                size={18}
                className={cn(
                  "shrink-0",
                  velvet ? "text-gold/80" : "text-label-2"
                )}
              />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side={compact ? "right" : undefined}
        data-testid="event-switcher-menu"
        className="w-[232px] rounded-2xl border border-hairline bg-surface p-1.5 shadow-lg"
      >
        <DropdownMenuLabel className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-label-2">
          Switch celebration
        </DropdownMenuLabel>
        {events.map((ev) => {
          const isSelected = ev.id === current.id;
          return (
            <DropdownMenuItem
              key={ev.id}
              data-testid={`event-switcher-option-${ev.id}`}
              onSelect={() => onSelectEvent(ev.id)}
              className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs ${
                isSelected
                  ? "bg-burgundy/8 font-semibold text-burgundy"
                  : "text-night"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate">{ev.title}</p>
                <p className="truncate text-[10px] text-label-2 tabular-nums">
                  {formatShortDate(ev.date)}
                </p>
              </div>
              {isSelected && (
                <Icon
                  name="check"
                  size={15}
                  className="shrink-0 text-burgundy"
                />
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="my-1 bg-hairline" />
        <DropdownMenuItem asChild>
          <Link
            href="/events/new"
            className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-burgundy"
          >
            <Icon name="add_circle" size={15} />
            <span>New event</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
