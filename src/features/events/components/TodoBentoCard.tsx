"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, Reorder, m, useDragControls } from "motion/react";
import { Icon, type IconName } from "@/components/ui/icon";
import type {
  NeedsAttentionAlert,
  NeedsAttentionKind,
} from "../lib/needs-attention";
import { celebrate } from "./desk/celebrate";

const KIND: Record<
  NeedsAttentionKind,
  { icon: IconName; stripe: string; tile: string }
> = {
  rsvp_deadline: {
    icon: "schedule",
    stripe: "#8a6620",
    tile: "bg-[#f3e9d6] text-[#593d08]",
  },
  unseated_guests: {
    icon: "table_restaurant",
    stripe: "#6e1426",
    tile: "bg-[#f6e3e6] text-[#6e1426]",
  },
  free_plan_limit: {
    icon: "credit_card",
    stripe: "#b4531f",
    tile: "bg-[#f6e1d3] text-[#7a3510]",
  },
  event_soon: {
    icon: "celebration",
    stripe: "#2e6a4f",
    tile: "bg-[#e4eee6] text-[#1f4d36]",
  },
};

const ORDER_KEY = "ariya-todo-order";
const DONE_KEY = "ariya-todo-done";
const todayKey = () => new Date().toISOString().slice(0, 10);

function readJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* not remembered this time */
  }
}

interface TodoBentoCardProps {
  alerts: NeedsAttentionAlert[];
}

/**
 * A priority board: drag the cards (or use the arrow keys on a grip) to put first things first, tick
 * one off when it's handled and it slides into "Done today". The order and today's ticks stay with
 * you; each card still opens the page where you act on it.
 */
export function TodoBentoCard({ alerts }: TodoBentoCardProps) {
  const [order, setOrder] = useState<string[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const [ready, setReady] = useState(false);

  // Restore the saved order and today's ticks; new alerts join at the bottom, stale ones drop away.
  useEffect(() => {
    const ids = alerts.map((a) => a.id);
    const saved = readJson<string[]>(ORDER_KEY, []).filter((id) =>
      ids.includes(id)
    );
    setOrder([...saved, ...ids.filter((id) => !saved.includes(id))]);
    const d = readJson<{ day: string; ids: string[] }>(DONE_KEY, {
      day: "",
      ids: [],
    });
    setDone(d.day === todayKey() ? d.ids.filter((id) => ids.includes(id)) : []);
    setReady(true);
  }, [alerts]);

  const byId = useMemo(() => new Map(alerts.map((a) => [a.id, a])), [alerts]);
  const list = (ready ? order : alerts.map((a) => a.id)).filter(
    (id) => !done.includes(id) && byId.has(id)
  );
  const doneList = done.filter((id) => byId.has(id));
  const total = alerts.length;
  const cleared = doneList.length;

  const reorder = (ids: string[]) => {
    const next = [...ids, ...order.filter((id) => !ids.includes(id))];
    setOrder(next);
    writeJson(ORDER_KEY, next);
  };
  const move = (id: string, delta: number) => {
    const i = list.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    reorder(next);
  };
  const tick = (id: string) => {
    const next = [...done, id];
    setDone(next);
    writeJson(DONE_KEY, { day: todayKey(), ids: next });
    if (next.filter((x) => byId.has(x)).length === total && total > 0)
      void celebrate({ x: 0.82, y: 0.5 });
  };
  const untick = (id: string) => {
    const next = done.filter((x) => x !== id);
    setDone(next);
    writeJson(DONE_KEY, { day: todayKey(), ids: next });
  };

  return (
    <section
      aria-labelledby="todo-bento-heading"
      data-testid="todo-bento-card"
      className="bento-card @container flex flex-col p-5 sm:p-6 lg:col-span-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2
          id="todo-bento-heading"
          className="font-display text-xl font-bold text-night"
        >
          To do
        </h2>
        {total > 0 && (
          <div
            className="flex rounded-full bg-surface-container p-0.5 text-xs font-semibold"
            role="tablist"
            aria-label="To do or done"
          >
            {(
              [
                ["todo", `To do ${list.length}`],
                ["done", `Done today ${cleared}`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`rounded-full px-3 py-1 transition-colors ${tab === key ? "bg-white text-night shadow-sm" : "text-label-2 hover:text-night"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="mb-4">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-surface-container"
            aria-hidden="true"
          >
            <div
              className="weave-fill h-full rounded-full transition-[width] duration-500"
              style={{ width: `${(cleared / total) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-label-2">
            {cleared === total
              ? "All cleared for today. Beautiful."
              : `${cleared} of ${total} cleared today · drag to set the order`}
          </p>
        </div>
      )}

      {total === 0 ? (
        <div
          data-testid="todo-empty-state"
          className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-ivory/60 px-5 py-8 text-center"
        >
          <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#e4eee6] text-[#1f4d36]">
            <Icon name="check_circle" size={20} />
          </span>
          <p className="text-sm font-semibold text-night">
            You&apos;re all caught up
          </p>
          <p className="mt-1 text-xs text-label-2">
            New things to do will appear here as your celebrations take shape.
          </p>
        </div>
      ) : tab === "todo" ? (
        list.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-[#e4eee6]/60 px-5 py-8 text-center">
            <span className="text-2xl" aria-hidden="true">
              🥂
            </span>
            <p className="mt-1 text-sm font-semibold text-night">
              Everything cleared for today
            </p>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={list}
            onReorder={reorder}
            className="flex flex-1 flex-col gap-2"
          >
            {list.map((id, i) => (
              <TodoItem
                key={id}
                alert={byId.get(id)!}
                index={i}
                count={list.length}
                onMove={(d) => move(id, d)}
                onTick={() => tick(id)}
              />
            ))}
          </Reorder.Group>
        )
      ) : (
        <ul className="flex flex-1 flex-col gap-2">
          <AnimatePresence initial={false}>
            {doneList.length === 0 ? (
              <li className="rounded-2xl bg-surface-container-low px-4 py-6 text-center text-sm text-label-2">
                Tick things off and they&apos;ll gather here.
              </li>
            ) : (
              doneList.map((id) => {
                const a = byId.get(id)!;
                return (
                  <m.li
                    key={id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 rounded-2xl bg-surface-container-low px-3 py-2.5"
                  >
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#2e6a4f] text-white"
                      aria-hidden="true"
                    >
                      <Icon name="check" size={14} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-label-2 line-through">
                      {a.message}
                    </span>
                    <button
                      type="button"
                      onClick={() => untick(id)}
                      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-burgundy hover:bg-surface-container"
                    >
                      Undo
                    </button>
                  </m.li>
                );
              })
            )}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function TodoItem({
  alert,
  index,
  count,
  onMove,
  onTick,
}: {
  alert: NeedsAttentionAlert;
  index: number;
  count: number;
  onMove: (delta: number) => void;
  onTick: () => void;
}) {
  const controls = useDragControls();
  const kind = KIND[alert.kind];
  return (
    <Reorder.Item
      value={alert.id}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      whileDrag={{
        scale: 1.03,
        boxShadow: "0 18px 36px -18px rgba(28,7,13,0.45)",
      }}
      className="relative flex items-center gap-2 overflow-hidden rounded-2xl bg-surface-container-lowest py-2 pl-1.5 pr-2 ring-1 ring-hairline"
    >
      <span
        className="absolute inset-y-2 left-0 w-1 rounded-full"
        style={{ background: kind.stripe }}
        aria-hidden="true"
      />
      <button
        type="button"
        aria-label={`Reorder: ${alert.message}. Use the up and down arrow keys.`}
        onPointerDown={(e) => controls.start(e)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" && index > 0) {
            e.preventDefault();
            onMove(-1);
          }
          if (e.key === "ArrowDown" && index < count - 1) {
            e.preventDefault();
            onMove(1);
          }
        }}
        className="ml-1 grid h-9 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-label-2 hover:bg-surface-container active:cursor-grabbing"
      >
        <svg viewBox="0 0 8 14" width="8" height="14" aria-hidden="true">
          {[2, 7, 12].map((y) => (
            <g key={y}>
              <circle cx="2" cy={y} r="1.2" fill="currentColor" />
              <circle cx="6" cy={y} r="1.2" fill="currentColor" />
            </g>
          ))}
        </svg>
      </button>
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${kind.tile}`}
        aria-hidden="true"
      >
        <Icon name={kind.icon} size={16} />
      </span>
      <Link
        href={alert.href}
        data-testid={`todo-item-${alert.id}`}
        className="group min-w-0 flex-1 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      >
        <p className="truncate text-sm font-semibold text-night group-hover:text-burgundy">
          {alert.message}
        </p>
        <p className="truncate text-[11px] text-label-2">
          {alert.eventTitle} · {alert.ctaLabel}
        </p>
      </Link>
      <button
        type="button"
        onClick={onTick}
        aria-label={`Mark done for today: ${alert.message}`}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[#2e6a4f]/40 text-[#2e6a4f] transition-colors hover:border-[#2e6a4f] hover:bg-[#2e6a4f] hover:text-white"
      >
        <Icon name="check" size={16} />
      </button>
    </Reorder.Item>
  );
}
