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
import type { SwitcherEvent } from "./nav-items";

interface EventSwitcherProps {
  events: SwitcherEvent[];
  activeEvent: SwitcherEvent | null;
  onSelectEvent: (eventId: string) => void;
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
}: EventSwitcherProps) {
  if (!activeEvent && events.length === 0) {
    return (
      <div
        data-testid="event-switcher-empty"
        aria-disabled="true"
        className="flex min-h-[44px] items-center gap-2.5 rounded-2xl border border-hairline bg-white/55 px-3.5 py-2.5 text-xs font-medium text-label-2 select-none"
      >
        <Icon name="celebration" size={16} className="shrink-0 text-label-3" />
        <span className="truncate">Create your first event</span>
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
          className="flex w-full min-h-[48px] items-center justify-between gap-2.5 rounded-2xl border border-hairline bg-white/85 hover:bg-white px-3.5 py-2 text-left shadow-2xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <div className="min-w-0 flex-1">
            <p
              data-testid="event-switcher-current-title"
              className="truncate text-xs font-semibold text-night"
            >
              {current.title}
            </p>
            <p className="truncate text-[11px] text-label-2 tabular-nums">
              {formatShortDate(current.date)}
            </p>
          </div>
          <Icon
            name="expand_more"
            size={18}
            className="shrink-0 text-label-2"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
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
