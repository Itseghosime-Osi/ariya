import type { VendorStatus, VendorTask, VendorWithTasks } from "../types";

export type VendorSort = "attention" | "cost" | "balance" | "name";

export const VENDOR_SORT_LABELS: Record<VendorSort, string> = {
  attention: "Needs attention first",
  cost: "Largest contract first",
  balance: "Biggest balance first",
  name: "Name A–Z",
};

export const VENDOR_STATUS_META: Record<
  VendorStatus,
  { label: string; blurb: string; ink: string; wash: string; order: number }
> = {
  draft: {
    label: "Draft",
    blurb: "Still comparing quotes",
    ink: "#5a474e",
    wash: "#f2ede4",
    order: 0,
  },
  contracted: {
    label: "Contracted",
    blurb: "Agreed, not yet locked in",
    ink: "#7a5612",
    wash: "#f3e9d6",
    order: 1,
  },
  confirmed: {
    label: "Confirmed",
    blurb: "Locked in for the day",
    ink: "#3b5b8a",
    wash: "#e3ecf4",
    order: 2,
  },
  completed: {
    label: "Completed",
    blurb: "Delivered and settled",
    ink: "#1f6b4a",
    wash: "#eaf4ee",
    order: 3,
  },
};

export const VENDOR_STATUSES: VendorStatus[] = [
  "draft",
  "contracted",
  "confirmed",
  "completed",
];

// Warm tones that stay apart on ivory; the category name is always written next to the colour.
const CATEGORY_TONES = [
  "#8a6620",
  "#b4531f",
  "#2e6a4f",
  "#3b5b8a",
  "#7a4b8c",
  "#c1283d",
];

export function categoryTone(category: string): string {
  let hash = 0;
  for (const char of category.toLowerCase()) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997;
  }
  return CATEGORY_TONES[hash % CATEGORY_TONES.length];
}

export function balanceDue(vendor: VendorWithTasks): number {
  return Math.max(0, vendor.cost_kobo - vendor.deposit_kobo);
}

/** How much of the contract has been paid, from 0 to 1. */
export function paidRatio(vendor: VendorWithTasks): number {
  if (vendor.cost_kobo <= 0) return vendor.deposit_kobo > 0 ? 1 : 0;
  return Math.min(1, Math.max(0, vendor.deposit_kobo / vendor.cost_kobo));
}

export function isTaskOverdue(task: VendorTask, todayKey: string): boolean {
  return Boolean(!task.is_done && task.due_date && task.due_date < todayKey);
}

export function countOverdue(
  vendor: VendorWithTasks,
  todayKey: string
): number {
  return vendor.tasks.filter((task) => isTaskOverdue(task, todayKey)).length;
}

export function vendorMatchesQuery(
  vendor: VendorWithTasks,
  query: string
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    vendor.name,
    vendor.category,
    vendor.contact_name,
    vendor.contact_email,
  ]
    .filter(Boolean)
    .some((field) => field!.toLowerCase().includes(needle));
}

export function sortVendors(
  vendors: VendorWithTasks[],
  sort: VendorSort,
  todayKey: string
): VendorWithTasks[] {
  const copy = [...vendors];
  switch (sort) {
    case "cost":
      return copy.sort((a, b) => b.cost_kobo - a.cost_kobo);
    case "balance":
      return copy.sort((a, b) => balanceDue(b) - balanceDue(a));
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "attention":
    default:
      return copy.sort((a, b) => {
        const byOverdue = countOverdue(b, todayKey) - countOverdue(a, todayKey);
        if (byOverdue !== 0) return byOverdue;
        const byBalance = balanceDue(b) - balanceDue(a);
        if (byBalance !== 0) return byBalance;
        return a.name.localeCompare(b.name);
      });
  }
}

export function summariseDeliverables(vendors: VendorWithTasks[]) {
  const all = vendors.flatMap((vendor) => vendor.tasks);
  const done = all.filter((task) => task.is_done).length;
  return {
    done,
    total: all.length,
    ratio: all.length === 0 ? 0 : done / all.length,
  };
}

export function statusCounts(vendors: VendorWithTasks[]) {
  return VENDOR_STATUSES.reduce(
    (acc, status) => {
      acc[status] = vendors.filter((v) => v.status === status).length;
      return acc;
    },
    {} as Record<VendorStatus, number>
  );
}
