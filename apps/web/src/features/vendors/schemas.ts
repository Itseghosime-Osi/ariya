import { z } from "zod";

export const VENDOR_CATEGORIES = [
  "Catering & Drinks",
  "Photography & Videography",
  "Decor & Floral",
  "DJ, Live Band & Sound",
  "Master of Ceremonies (MC)",
  "Security & Bouncers",
  "Traditional Attire & Aso-Ebi",
  "Cake & Desserts",
  "Hair & Makeup",
  "Stationery & Calligraphy",
  "Logistics & Coordination",
  "Other",
] as const;

export const vendorStatusSchema = z.enum([
  "draft",
  "contracted",
  "confirmed",
  "completed",
]);

export const createVendorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vendor name is required")
    .max(100, "Vendor name must not exceed 100 characters"),
  category: z
    .string()
    .trim()
    .min(1, "Category is required")
    .max(50, "Category must not exceed 50 characters"),
  contact_name: z.string().trim().max(100).nullable().optional(),
  contact_phone: z.string().trim().max(30).nullable().optional(),
  contact_email: z
    .string()
    .trim()
    .email("Invalid email format")
    .nullable()
    .optional()
    .or(z.literal("")),
  cost_kobo: z
    .number()
    .int("Cost must be an integer number of kobo")
    .min(0, "Cost cannot be negative"),
  deposit_kobo: z
    .number()
    .int("Deposit must be an integer number of kobo")
    .min(0, "Deposit cannot be negative"),
  status: vendorStatusSchema.default("contracted"),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;

export const updateVendorSchema = createVendorSchema.partial();
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

export const createVendorTaskSchema = z.object({
  vendor_id: z.guid("Invalid vendor ID"),
  task: z
    .string()
    .trim()
    .min(1, "Task description is required")
    .max(200, "Task description must not exceed 200 characters"),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD")
    .nullable()
    .optional()
    .or(z.literal("")),
  is_done: z.boolean().default(false),
});

export type CreateVendorTaskInput = z.infer<typeof createVendorTaskSchema>;

export const updateVendorTaskSchema = z.object({
  task: z.string().trim().min(1).max(200).optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
    .or(z.literal("")),
  is_done: z.boolean().optional(),
});

export type UpdateVendorTaskInput = z.infer<typeof updateVendorTaskSchema>;
