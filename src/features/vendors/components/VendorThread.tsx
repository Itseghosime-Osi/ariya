"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { formatKobo, formatPhone } from "@/lib/format";
import type { VendorWithTasks } from "../types";
import {
  VENDOR_STATUS_META,
  balanceDue,
  categoryTone,
  countOverdue,
  isTaskOverdue,
  paidRatio,
} from "../lib/vendor-insights";

interface VendorThreadProps {
  vendor: VendorWithTasks;
  todayKey: string;
  onEdit: (vendor: VendorWithTasks) => void;
  onDelete: (vendorId: string) => void;
  onAddTask: (vendor: VendorWithTasks) => void;
  onToggleTask: (taskId: string, isDone: boolean) => void;
  onDeleteTask: (taskId: string) => void;
}

/**
 * One supplier as a thread on the loom: a coloured warp down the side, who to call, and the money in
 * a single line. The deliverables stay folded away until they are wanted.
 */
export function VendorThread({
  vendor,
  todayKey,
  onEdit,
  onDelete,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: VendorThreadProps) {
  const [open, setOpen] = useState(false);
  const status = VENDOR_STATUS_META[vendor.status];
  const tone = categoryTone(vendor.category);
  const paid = paidRatio(vendor);
  const balance = balanceDue(vendor);
  const overdue = countOverdue(vendor, todayKey);
  const done = vendor.tasks.filter((task) => task.is_done).length;
  const detailId = `vendor-${vendor.id}-detail`;

  return (
    <li className="relative">
      <span
        className="absolute inset-y-3 left-0 w-[3px] rounded-full"
        style={{ backgroundColor: tone }}
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={detailId}
        className="flex w-full items-center gap-4 py-4 pl-5 pr-3 text-left transition-colors hover:bg-white/55 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burgundy sm:pl-6 sm:pr-5"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-ink">
            <span className="truncate">{vendor.category}</span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider"
              style={{ backgroundColor: status.wash, color: status.ink }}
            >
              <span
                className="h-1 w-1 rounded-full"
                style={{ backgroundColor: status.ink }}
                aria-hidden="true"
              />
              {status.label}
            </span>
            {overdue > 0 && (
              <span className="rounded-full bg-error-container px-2 py-0.5 text-[10px] font-bold tracking-wider text-error">
                {overdue} overdue
              </span>
            )}
          </span>

          <span className="mt-1 block truncate font-display text-lg font-bold leading-tight text-night [overflow-wrap:anywhere]">
            {vendor.name}
          </span>

          {vendor.contact_name && (
            <span className="mt-0.5 block truncate text-xs text-label-2">
              {vendor.contact_name}
            </span>
          )}

          <span className="mt-1.5 flex items-center gap-2 text-[11px] text-label-2 sm:hidden">
            <span className="tabular-nums">
              {formatKobo(vendor.deposit_kobo)} of{" "}
              {formatKobo(vendor.cost_kobo)}
            </span>
            <span className="tabular-nums text-label-3">
              {done}/{vendor.tasks.length}
            </span>
          </span>
        </span>

        <span className="hidden w-40 shrink-0 sm:block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold text-night tabular-nums">
              {formatKobo(vendor.deposit_kobo)}
            </span>
            <span className="text-[10px] text-label-3 tabular-nums">
              of {formatKobo(vendor.cost_kobo)}
            </span>
          </span>
          <span
            className="mt-1.5 block h-1.5 overflow-hidden rounded-full"
            style={{
              backgroundColor: "#eadfcd",
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(28,7,13,0.10) 0 3px, transparent 3px 7px)",
            }}
          >
            <span
              className="block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: `${paid * 100}%`, backgroundColor: tone }}
            />
          </span>
          <span
            className={`mt-1 block text-[10px] tabular-nums ${balance > 0 ? "text-gold-ink" : "text-label-3"}`}
          >
            {balance > 0 ? `${formatKobo(balance)} to go` : "Settled"}
          </span>
        </span>

        <span className="hidden w-14 shrink-0 text-right text-[11px] font-semibold text-label-2 tabular-nums md:block">
          {done}/{vendor.tasks.length}
        </span>

        <Icon
          name="expand_more"
          size={18}
          className={`shrink-0 text-label-3 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={detailId}
          className="border-t border-hairline bg-white/35 px-5 py-4 sm:px-6"
        >
          {(vendor.contact_phone || vendor.contact_email) && (
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
              {vendor.contact_phone && (
                <a
                  href={`tel:${vendor.contact_phone}`}
                  className="inline-flex min-h-[28px] items-center gap-1.5 text-label-2 hover:text-burgundy hover:underline"
                >
                  <Icon name="phone" size={13} />
                  {formatPhone(vendor.contact_phone)}
                </a>
              )}
              {vendor.contact_email && (
                <a
                  href={`mailto:${vendor.contact_email}`}
                  className="inline-flex min-h-[28px] min-w-0 items-center gap-1.5 text-label-2 hover:text-burgundy hover:underline"
                >
                  <Icon name="mail" size={13} className="shrink-0" />
                  <span className="truncate">{vendor.contact_email}</span>
                </a>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-label-2">
              Deliverables
            </span>
            <button
              type="button"
              onClick={() => onAddTask(vendor)}
              className="desk-chip inline-flex min-h-[32px] items-center gap-1 rounded-full px-3 text-[11px] font-semibold text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              <Icon name="add_circle" size={13} />
              Add deliverable
            </button>
          </div>

          {vendor.tasks.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-hairline px-3 py-2.5 text-[11px] text-label-3">
              No milestones yet. Add the fittings, rehearsals and briefings as
              they come up.
            </p>
          ) : (
            <ul className="mt-2 space-y-0.5">
              {vendor.tasks.map((task) => {
                const late = isTaskOverdue(task, todayKey);
                return (
                  <li
                    key={task.id}
                    className="group/task flex items-start gap-2.5 rounded-lg px-1 py-1 hover:bg-white/60"
                  >
                    <input
                      id={`task-${task.id}`}
                      type="checkbox"
                      checked={task.is_done}
                      onChange={(event) =>
                        onToggleTask(task.id, event.target.checked)
                      }
                      className="mt-[3px] h-4 w-4 shrink-0 cursor-pointer accent-[var(--burgundy)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                    />
                    <label
                      htmlFor={`task-${task.id}`}
                      className={`min-w-0 flex-1 cursor-pointer text-[12px] leading-snug [overflow-wrap:anywhere] ${
                        task.is_done
                          ? "text-label-3 line-through"
                          : "text-night"
                      }`}
                    >
                      {task.task}
                    </label>
                    {task.due_date && (
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${
                          late
                            ? "bg-error-container font-bold text-error"
                            : "text-label-3"
                        }`}
                      >
                        {task.due_date.slice(5)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      aria-label={`Delete deliverable: ${task.task}`}
                      className="shrink-0 rounded p-0.5 text-label-3 opacity-50 transition-opacity hover:text-error focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy group-hover/task:opacity-100"
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 flex items-center gap-2 border-t border-hairline pt-3">
            <button
              type="button"
              onClick={() => onEdit(vendor)}
              className="desk-chip inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-label-2 hover:text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              <Icon name="edit" size={14} />
              Edit contract
            </button>
            <button
              type="button"
              onClick={() => onDelete(vendor.id)}
              aria-label={`Delete ${vendor.name}`}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-label-3 transition-colors hover:bg-error-container hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              <Icon name="delete" size={14} />
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
