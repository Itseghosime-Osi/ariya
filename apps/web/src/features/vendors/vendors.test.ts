import { describe, expect, it } from "vitest";
import {
  createVendorSchema,
  updateVendorSchema,
  createVendorTaskSchema,
} from "./schemas";
import { computeVendorStats } from "./queries";
import { formatKobo } from "@/lib/format";
import type { Vendor, VendorTask } from "./types";

describe("Vendors domain & validation", () => {
  it("validates createVendorSchema correctly", () => {
    const valid = createVendorSchema.safeParse({
      name: "Tantalizers Caterers",
      category: "Catering & Drinks",
      contact_name: "Adeola Balogun",
      contact_phone: "08031234567",
      contact_email: "adeola@caterers.ng",
      cost_kobo: 150000000, // ₦1,500,000
      deposit_kobo: 50000000, // ₦500,000
      status: "contracted",
    });
    expect(valid.success).toBe(true);

    const negativeCost = createVendorSchema.safeParse({
      name: "Bad Vendor",
      category: "Other",
      cost_kobo: -100,
      deposit_kobo: 0,
    });
    expect(negativeCost.success).toBe(false);

    const emptyName = createVendorSchema.safeParse({
      name: "   ",
      category: "Music",
      cost_kobo: 100000,
      deposit_kobo: 0,
    });
    expect(emptyName.success).toBe(false);
  });

  it("validates updateVendorSchema partial updates", () => {
    const partial = updateVendorSchema.safeParse({
      deposit_kobo: 100000000,
      status: "confirmed",
    });
    expect(partial.success).toBe(true);
  });

  it("validates vendor task schemas", () => {
    const validTask = createVendorTaskSchema.safeParse({
      vendor_id: "c4b14d82-c283-490b-be8e-fdb1681283c4",
      task: "Finalize bespoke 4-tier red velvet cake design",
      due_date: "2026-11-15",
      is_done: false,
    });
    expect(validTask.success).toBe(true);

    const invalidDate = createVendorTaskSchema.safeParse({
      vendor_id: "c4b14d82-c283-490b-be8e-fdb1681283c4",
      task: "Setup speakers",
      due_date: "15-11-2026", // Not YYYY-MM-DD
    });
    expect(invalidDate.success).toBe(false);
  });

  it("computes vendor financial totals and overdue tasks correctly", () => {
    const mockVendors: Vendor[] = [
      {
        id: "v1",
        event_id: "e1",
        name: "Caterer",
        category: "Catering & Drinks",
        contact_name: null,
        contact_phone: null,
        contact_email: null,
        cost_kobo: 200000000, // ₦2,000,000
        deposit_kobo: 120000000, // ₦1,200,000
        status: "contracted",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "v2",
        event_id: "e1",
        name: "DJ",
        category: "DJ, Live Band & Sound",
        contact_name: null,
        contact_phone: null,
        contact_email: null,
        cost_kobo: 80000000, // ₦800,000
        deposit_kobo: 80000000, // ₦800,000
        status: "confirmed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockTasks: VendorTask[] = [
      {
        id: "t1",
        vendor_id: "v1",
        event_id: "e1",
        task: "Food tasting session",
        due_date: "2020-01-01", // Past date (overdue)
        is_done: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "t2",
        vendor_id: "v1",
        event_id: "e1",
        task: "Menu print approval",
        due_date: "2020-01-01", // Past date but completed -> not overdue
        is_done: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "t3",
        vendor_id: "v2",
        event_id: "e1",
        task: "Playlist review",
        due_date: "2099-12-31", // Future date
        is_done: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const stats = computeVendorStats(mockVendors, mockTasks);

    expect(stats.contractedKobo).toBe(280000000);
    expect(stats.depositsPaidKobo).toBe(200000000);
    expect(stats.balanceDueKobo).toBe(80000000); // ₦800,000
    expect(stats.totalTasksCount).toBe(3);
    expect(stats.completedTasksCount).toBe(1);
    expect(stats.overdueTasksCount).toBe(1);

    expect(formatKobo(stats.contractedKobo)).toContain("2,800,000");
    expect(formatKobo(stats.balanceDueKobo)).toContain("800,000");
  });
});
