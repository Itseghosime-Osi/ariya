"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
import { formatKobo, formatPhone } from "@/lib/format";
import { VendorTaskList } from "./VendorTaskList";
import type { VendorWithTasks } from "../types";

interface VendorCardProps {
  vendor: VendorWithTasks;
  onEdit: (vendor: VendorWithTasks) => void;
  onDelete: (vendorId: string) => void;
  onAddTask: (vendor: VendorWithTasks) => void;
  onToggleTask: (taskId: string, isDone: boolean) => void;
  onDeleteTask: (taskId: string) => void;
}

export function VendorCard({
  vendor,
  onEdit,
  onDelete,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: VendorCardProps) {
  const balanceDue = Math.max(0, vendor.cost_kobo - vendor.deposit_kobo);

  const statusStyles: Record<string, string> = {
    draft:
      "bg-surface-container text-on-surface-variant border-outline-variant/40",
    contracted: "bg-amber-50 text-amber-800 border-amber-200",
    confirmed: "bg-blue-50 text-blue-800 border-blue-200",
    completed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-xs flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Top meta row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-wine/10 text-wine">
                {vendor.category}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  statusStyles[vendor.status] || statusStyles.contracted
                }`}
              >
                {vendor.status}
              </span>
            </div>
            <h3 className="font-serif text-lg font-bold text-wine leading-tight">
              {vendor.name}
            </h3>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(vendor)}
              className="p-1.5 text-on-surface-variant hover:text-wine hover:bg-wine/5 rounded-lg transition-colors"
              title="Edit vendor"
            >
              <Icon name="edit" className="text-sm" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(vendor.id)}
              className="p-1.5 text-on-surface-variant hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete vendor"
            >
              <Icon name="delete" className="text-sm" />
            </button>
          </div>
        </div>

        {/* Contact info snippet */}
        {(vendor.contact_name ||
          vendor.contact_phone ||
          vendor.contact_email) && (
          <div className="text-xs text-on-surface-variant space-y-1 bg-surface-container-low/50 p-2.5 rounded-xl border border-outline-variant/20">
            {vendor.contact_name && (
              <div className="flex items-center gap-1.5 font-medium text-wine">
                <Icon name="person" className="text-xs" />
                <span>{vendor.contact_name}</span>
              </div>
            )}
            <div className="flex items-center gap-3 flex-wrap text-[11px]">
              {vendor.contact_phone && (
                <a
                  href={`tel:${vendor.contact_phone}`}
                  className="hover:underline flex items-center gap-1"
                >
                  <Icon name="phone" className="text-xs text-wine/70" />
                  <span>{formatPhone(vendor.contact_phone)}</span>
                </a>
              )}
              {vendor.contact_email && (
                <a
                  href={`mailto:${vendor.contact_email}`}
                  className="hover:underline flex items-center gap-1"
                >
                  <Icon name="mail" className="text-xs text-wine/70" />
                  <span>{vendor.contact_email}</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Financial metrics */}
        <div className="grid grid-cols-3 gap-2 text-center bg-surface-container-lowest p-2.5 rounded-xl border border-outline-variant/30 text-xs">
          <div>
            <span className="text-[9px] uppercase font-bold text-wine/70 block">
              Contract
            </span>
            <span className="font-semibold text-wine text-xs">
              {formatKobo(vendor.cost_kobo)}
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-emerald-800/80 block">
              Paid
            </span>
            <span className="font-semibold text-emerald-800 text-xs">
              {formatKobo(vendor.deposit_kobo)}
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-amber-900/80 block">
              Balance
            </span>
            <span className="font-semibold text-amber-900 text-xs">
              {formatKobo(balanceDue)}
            </span>
          </div>
        </div>

        {/* Deliverables Tasks List Component */}
        <VendorTaskList
          tasks={vendor.tasks}
          onAddTask={() => onAddTask(vendor)}
          onToggleTask={onToggleTask}
          onDeleteTask={onDeleteTask}
        />
      </div>
    </div>
  );
}
