import {
  celebrate,
  claimMilestone,
} from "@/features/events/components/desk/celebrate";
import type { VendorWithTasks } from "../types";

/**
 * Confetti the first time every deliverable across every vendor is ticked off. The toggled task is
 * treated as done, because the caller holds the list from before its optimistic update.
 */
export function celebratedIfAllDone(
  eventId: string,
  vendors: VendorWithTasks[],
  toggledTaskId: string
) {
  const tasks = vendors.flatMap((vendor) => vendor.tasks);
  if (tasks.length === 0) return;

  const done = tasks.filter(
    (task) => task.id === toggledTaskId || task.is_done
  ).length;
  if (done !== tasks.length) return;
  if (!claimMilestone(`${eventId}:vendor-deliverables`)) return;

  void celebrate({ x: 0.5, y: 0.42 });
}
