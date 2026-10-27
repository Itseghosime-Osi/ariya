import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Vendor,
  VendorTask,
  VendorWithTasks,
  VendorFinancialStats,
  VendorsData,
} from "./types";

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

export async function getVendorsWithTasks(
  eventId: string
): Promise<VendorsData> {
  const supabase = await createClient();

  const [vendorsRes, tasksRes] = await Promise.all([
    supabase
      .from("vendors")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
    supabase
      .from("vendor_tasks")
      .select("*")
      .eq("event_id", eventId)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  const rawVendors = (vendorsRes.data || []) as Vendor[];
  const rawTasks = (tasksRes.data || []) as VendorTask[];

  const tasksByVendor = new Map<string, VendorTask[]>();
  for (const t of rawTasks) {
    const list = tasksByVendor.get(t.vendor_id) || [];
    list.push(t);
    tasksByVendor.set(t.vendor_id, list);
  }

  const vendors: VendorWithTasks[] = rawVendors.map((v) => ({
    ...v,
    tasks: tasksByVendor.get(v.id) || [],
  }));

  const stats = computeVendorStats(rawVendors, rawTasks);

  return { vendors, stats };
}
