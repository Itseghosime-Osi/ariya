"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { Table, TableShape } from "../types";

interface TableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    capacity: number;
    shape: TableShape;
  }) => Promise<void>;
  initialTable?: Table | null;
}

export function TableFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialTable,
}: TableFormModalProps) {
  const [name, setName] = useState(initialTable?.name || "");
  const [capacity, setCapacity] = useState(initialTable?.capacity || 8);
  const [shape, setShape] = useState<TableShape>(
    (initialTable?.shape as TableShape) || "round"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please provide a name or table number.");
      return;
    }
    if (capacity < 1 || capacity > 50) {
      setErrorMsg("Capacity must be between 1 and 50.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onSubmit({ name: name.trim(), capacity, shape });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save table");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-outline-variant/40 space-y-5 animate-in fade-in duration-150">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-wine font-medium">
            {initialTable ? "Edit Table Layout" : "Add Banquet Table"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-wine p-1 rounded-lg"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl border border-red-200 flex items-center gap-2">
            <Icon name="error" className="text-sm text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-wine uppercase tracking-wider block">
              Table Name / Number
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Table 01 - Royalty"
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-paper text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-wine uppercase tracking-wider block">
                Total Capacity
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-paper text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-wine uppercase tracking-wider block">
                Geometry Shape
              </label>
              <select
                value={shape}
                onChange={(e) => setShape(e.target.value as TableShape)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-paper text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
              >
                <option value="round">Round Banquet</option>
                <option value="rectangular">Rectangular</option>
                <option value="oval">Oval</option>
                <option value="head">Head / High Table</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-wine"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-wine hover:bg-wine/90 text-ivory text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving..."
                : initialTable
                  ? "Save Changes"
                  : "Create Table"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
