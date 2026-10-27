import "server-only";
import { createClient } from "@/lib/supabase/server";
import { computeVendorStats } from "./utils";
import type { Vendor, VendorTask, VendorWithTasks, VendorsData } from "./types";

export { computeVendorStats };

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
