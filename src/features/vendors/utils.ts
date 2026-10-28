import type { Vendor, VendorTask, VendorFinancialStats } from "./types";

export function computeVendorStats(
  vendors: Vendor[],
  tasks: VendorTask[]
): VendorFinancialStats {
  const contractedKobo = vendors.reduce(
    (acc, v) => acc + (v.cost_kobo || 0),
    0
  );
  const depositsPaidKobo = vendors.reduce(
    (acc, v) => acc + (v.deposit_kobo || 0),
    0
  );
  const balanceDueKobo = vendors.reduce(
    (acc, v) => acc + Math.max(0, (v.cost_kobo || 0) - (v.deposit_kobo || 0)),
    0
  );

  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.is_done).length;

  const todayStr = new Date().toISOString().split("T")[0];
  const overdueTasksCount = tasks.filter(
    (t) => !t.is_done && t.due_date && t.due_date < todayStr
  ).length;

  return {
    contractedKobo,
    depositsPaidKobo,
    balanceDueKobo,
    overdueTasksCount,
    completedTasksCount,
    totalTasksCount,
  };
}
