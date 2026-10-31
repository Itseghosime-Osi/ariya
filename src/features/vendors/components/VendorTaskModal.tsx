"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface VendorTaskModalProps {
  isOpen: boolean;
  vendorName: string;
  onClose: () => void;
  onSubmit: (task: string, dueDate: string | null) => Promise<void>;
}

const LABEL = "text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink";
const FIELD =
  "desk-field mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none";

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-md gap-0 overflow-y-auto border border-gold/30 bg-ivory p-0">
        <DialogHeader className="relative gap-1.5 px-6 pb-5 pt-7 sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
            Deliverables
          </p>
          <DialogTitle className="font-serif text-3xl font-bold leading-tight">
            Add a task
          </DialogTitle>
          <DialogDescription>
            What {vendorName} still owes before the day, and by when.
          </DialogDescription>
          <span
            aria-hidden="true"
            className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-gold/70 via-gold/20 to-transparent sm:inset-x-8"
          />
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 px-6 pb-6 pt-5 sm:px-8"
        >
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-error/30 bg-error-container px-3 py-2 text-xs text-error"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="task-description" className={LABEL}>
              Task Description *
            </label>
            <input
              id="task-description"
              type="text"
              required
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Confirm menu tasting and food warmers"
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="task-due" className={LABEL}>
              Due Date (Optional)
            </label>
            <input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={FIELD}
            />
          </div>

          <DialogFooter className="mt-2 flex flex-col-reverse gap-2 border-t border-outline-variant/60 pt-5 sm:flex-row sm:justify-end sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="rounded-full px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-full px-6"
            >
              {loading ? "Adding..." : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
