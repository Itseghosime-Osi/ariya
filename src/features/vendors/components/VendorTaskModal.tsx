"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";

interface VendorTaskModalProps {
  isOpen: boolean;
  vendorName: string;
  onClose: () => void;
  onSubmit: (task: string, dueDate: string | null) => Promise<void>;
}

export function VendorTaskModal({
  isOpen,
  vendorName,
  onClose,
  onSubmit,
}: VendorTaskModalProps) {
  const [task, setTask] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) {
      setError("Task description is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(task.trim(), dueDate || null);
      setTask("");
      setDueDate("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night/50 backdrop-blur-xs">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 max-w-md w-full p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-wine">
              Add Deliverable / Task
            </h2>
            <p className="text-[11px] text-on-surface-variant">
              For {vendorName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-wine p-1 rounded-lg"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-wine mb-1">
              Task Description *
            </label>
            <input
              type="text"
              required
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Confirm menu tasting and food warmers"
              className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 focus:border-wine outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-wine mb-1">
              Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 focus:border-wine outline-hidden bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-outline-variant/50 text-wine hover:bg-wine/5 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-wine text-ivory font-semibold hover:bg-wine/90 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
