"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatLagosDate, getLagosDateKey } from "@/lib/format";
import type { ComingUpItem } from "../lib/coming-up";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function addDaysToKey(dateKey: string, days: number): string {
  const utc = Date.parse(`${dateKey}T12:00:00Z`) + days * 86_400_000;
  return new Date(utc).toISOString().slice(0, 10);
}

function getMondayKey(todayKey: string): string {
  const d = new Date(`${todayKey}T12:00:00Z`);
  const dow = d.getUTCDay();
  return addDaysToKey(todayKey, dow === 0 ? -6 : 1 - dow);
}

interface ThisWeekBentoCardProps {
  items: ComingUpItem[];
}

export function ThisWeekBentoCard({ items }: ThisWeekBentoCardProps) {
  const todayKey = useMemo(
    () => getLagosDateKey(new Date()) ?? "2026-01-01",
    []
  );
  const baseMondayKey = useMemo(() => getMondayKey(todayKey), [todayKey]);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedKey, setSelectedKey] = useState<string>(todayKey);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, ComingUpItem[]>();
    for (const item of items) {
      const list = map.get(item.lagosDateKey) ?? [];
      list.push(item);
      map.set(item.lagosDateKey, list);
    }
    return map;
  }, [items]);

  const weekDays = useMemo(() => {
    const startKey = addDaysToKey(baseMondayKey, weekOffset * 7);
    return WEEKDAY_LABELS.map((label, i) => {
      const key = addDaysToKey(startKey, i);
      return {
        key,
        label,
        dayNum: Number.parseInt(key.slice(8, 10), 10),
        isToday: key === todayKey,
        hasItems: (itemsByDay.get(key)?.length ?? 0) > 0,
      };
    });
  }, [baseMondayKey, itemsByDay, todayKey, weekOffset]);

  const handleWeekChange = (nextOffset: number) => {
    const clamped = Math.max(0, Math.min(2, nextOffset));
    setWeekOffset(clamped);
    const startKey = addDaysToKey(baseMondayKey, clamped * 7);
    const firstWithItems = WEEKDAY_LABELS.map((_, i) =>
      addDaysToKey(startKey, i)
    ).find((k) => (itemsByDay.get(k)?.length ?? 0) > 0);
    setSelectedKey(firstWithItems ?? (clamped === 0 ? todayKey : startKey));
  };

  const selectedItems = itemsByDay.get(selectedKey) ?? [];
  const selectedLabel = formatLagosDate(`${selectedKey}T12:00:00Z`, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <section
      aria-labelledby="this-week-heading"
      data-testid="this-week-card"
      className="bento-card @container flex flex-col justify-between p-5 sm:p-6 lg:col-span-4"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <h2
            id="this-week-heading"
            className="font-display text-xl font-bold text-night"
          >
            This week
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleWeekChange(weekOffset - 1)}
              disabled={weekOffset <= 0}
              aria-label="Previous week"
              data-testid="this-week-prev"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-ivory/70 text-night disabled:opacity-40 hover:bg-ivory"
            >
              <Icon name="chevron_left" size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleWeekChange(weekOffset + 1)}
              disabled={weekOffset >= 2}
              aria-label="Next week"
              data-testid="this-week-next"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-ivory/70 text-night disabled:opacity-40 hover:bg-ivory"
            >
              <Icon name="chevron_right" size={16} />
            </button>
          </div>
        </div>

        <div
          role="group"
          aria-label="Days of the week"
          className="grid grid-cols-7 gap-1.5"
        >
          {weekDays.map((day) => {
            const isSelected = day.key === selectedKey;
            const count = itemsByDay.get(day.key)?.length ?? 0;
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedKey(day.key)}
                aria-pressed={isSelected}
                data-testid={`week-day-${day.key}`}
                className={`group relative flex flex-col overflow-hidden rounded-xl text-center transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                  isSelected
                    ? "bg-[#1c070d] text-ivory shadow-[0_12px_24px_-12px_rgba(28,7,13,0.7)]"
                    : "bg-ivory text-night ring-1 ring-hairline"
                }`}
              >
                <span
                  className={`py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${
                    isSelected
                      ? "bg-[#e9c98a] text-[#1c070d]"
                      : day.isToday
                        ? "bg-burgundy text-white"
                        : "bg-surface-container text-label-2"
                  }`}
                >
                  {day.label}
                </span>
                <span className="py-1.5 font-display text-lg font-bold leading-none tabular-nums">
                  {day.dayNum}
                </span>
                <span className="sr-only">
                  {day.isToday ? ", today" : ""}
                  {count ? `, ${count} ${count === 1 ? "item" : "items"}` : ""}
                </span>
                <span
                  className="flex h-2 items-center justify-center pb-1.5"
                  aria-hidden="true"
                >
                  {count > 0 && (
                    <span
                      className={`h-1.5 rounded-full ${isSelected ? "bg-[#e9c98a]" : "bg-burgundy"}`}
                      style={{ width: 6 + Math.min(3, count - 1) * 4 }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink">
          {selectedKey === todayKey
            ? `Today · ${selectedLabel}`
            : selectedLabel}
        </p>
        {selectedItems.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-hairline px-3.5 py-5 text-center">
            <p className="text-xs text-label-2">A quiet day. Nothing due.</p>
          </div>
        ) : (
          <ul className="relative space-y-2 pl-4">
            <span
              className="absolute bottom-2 left-[5px] top-2 w-px bg-[#b8864b]/40"
              aria-hidden="true"
            />
            {selectedItems.map((item) => (
              <li key={item.id} className="relative">
                <span
                  className="absolute -left-[15px] top-3.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-burgundy"
                  aria-hidden="true"
                />
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl bg-surface-container px-3 py-2.5 text-xs transition-colors hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                >
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ivory text-burgundy ring-1 ring-hairline"
                    aria-hidden="true"
                  >
                    <Icon
                      name={
                        item.kind === "event_date"
                          ? "celebration"
                          : item.kind === "rsvp_deadline"
                            ? "schedule"
                            : "restaurant_menu"
                      }
                      size={15}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-night">
                      {item.title}
                    </span>
                    <span className="block truncate text-[11px] text-label-2">
                      {item.eventTitle}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-tint-sand px-2 py-0.5 text-[10px] font-semibold text-gold-ink">
                    {item.relativeLabel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
