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
      className="bento-card @container flex flex-col justify-between p-5 sm:p-6 lg:col-span-3"
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
          className="grid grid-cols-7 gap-1 rounded-2xl bg-ivory/75 p-1.5"
        >
          {weekDays.map((day) => {
            const isSelected = day.key === selectedKey;
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedKey(day.key)}
                aria-pressed={isSelected}
                data-testid={`week-day-${day.key}`}
                className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-center transition-all ${
                  day.isToday
                    ? "bg-burgundy text-white font-semibold shadow-2xs"
                    : isSelected
                      ? "bg-white text-burgundy font-semibold shadow-2xs"
                      : "text-night/75 hover:bg-white/60 hover:text-night font-medium"
                }`}
              >
                <span className="text-[10px] leading-tight opacity-85">
                  {day.label}
                </span>
                <span className="mt-0.5 text-xs tabular-nums">
                  {day.dayNum}
                </span>
                <span
                  aria-hidden="true"
                  className={`mt-1 h-1.5 w-1.5 rounded-full ${
                    day.hasItems
                      ? day.isToday
                        ? "bg-white"
                        : "bg-burgundy"
                      : "bg-transparent"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex-1 flex flex-col justify-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-label-2 mb-2">
          {selectedKey === todayKey
            ? `Today · ${selectedLabel}`
            : selectedLabel}
        </p>
        {selectedItems.length === 0 ? (
          <div className="rounded-2xl bg-ivory/55 px-3.5 py-5 text-center">
            <p className="text-xs text-label-2">
              No tasks or deadlines on this day.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {selectedItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-ivory/70 hover:bg-ivory px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-night truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-label-2 truncate">
                      {item.eventTitle}
                    </p>
                  </div>
                  <Icon
                    name="chevron_right"
                    size={15}
                    className="shrink-0 text-label-2"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
