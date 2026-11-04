"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
import type { VendorTask } from "../types";

interface VendorTaskListProps {
  tasks: VendorTask[];
  onAddTask: () => void;
  onToggleTask: (taskId: string, isDone: boolean) => void;
  onDeleteTask: (taskId: string) => void;
}

export function VendorTaskList({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: VendorTaskListProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-wine text-[11px] uppercase tracking-wider flex items-center gap-1">
          <Icon name="check_circle" className="text-xs" />
          <span>Deliverables ({tasks.length})</span>
        </span>
        <button
          type="button"
          onClick={onAddTask}
          className="text-[11px] font-semibold text-wine hover:underline flex items-center gap-0.5"
        >
          <Icon name="add_circle" className="text-xs" />
          <span>Add</span>
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-[11px] text-on-surface-variant/70 italic py-1">
          No tasks or milestones logged yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((task) => {
            const isOverdue =
              !task.is_done && task.due_date && task.due_date < todayStr;

            return (
              <li
                key={task.id}
                className="flex items-start justify-between gap-2 text-xs group"
              >
                <label className="flex items-start gap-2 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={task.is_done}
                    onChange={(e) => onToggleTask(task.id, e.target.checked)}
                    className="mt-0.5 rounded text-wine focus:ring-wine"
                  />
                  <span
                    className={`leading-snug break-words ${
                      task.is_done
                        ? "line-through text-on-surface-variant/50"
                        : "text-on-surface"
                    }`}
                  >
                    {task.task}
                  </span>
                </label>

                <div className="flex items-center gap-1 shrink-0">
                  {task.due_date && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isOverdue
                          ? "bg-red-50 text-red-700 font-bold border border-red-200"
                          : "text-on-surface-variant bg-surface-container"
                      }`}
                    >
                      {task.due_date}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="text-on-surface-variant/40 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    title="Delete task"
                  >
                    <Icon name="close" className="text-xs" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
