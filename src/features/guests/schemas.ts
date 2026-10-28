import { z } from "zod";
import { normalizePhoneNumber } from "@/lib/phone";

export const GUEST_SIDE_ENUM = [
  "bride",
  "groom",
  "family",
  "vip",
  "planner",
  "imported",
  "mutual",
] as const;
export type GuestSide = (typeof GUEST_SIDE_ENUM)[number];

export const guestRowSchema = z.object({
  name: z.string().trim().min(1, "Guest name is required"),
  phone: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((val) => (val ? normalizePhoneNumber(val) : null)),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val ? val.toLowerCase() : null)),
  party_size: z.coerce
    .number()
    .int("Party size must be a whole number")
    .min(1, "Party size must be at least 1")
    .max(20, "Party size cannot exceed 20")
    .default(1),
  side: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((val): GuestSide => {
      if (val && (GUEST_SIDE_ENUM as readonly string[]).includes(val)) {
        return val as GuestSide;
      }
      return "mutual";
    }),
  group_name: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((val) => val || null),
  plus_ones_allowed: z.coerce.boolean().optional().default(false),
  is_vip: z.coerce.boolean().optional().default(false),
  notes: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((val) => val || null),
});

export type ValidatedGuestRow = z.infer<typeof guestRowSchema>;

export interface ExistingGuestIdentifier {
  id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  matchType?: "phone" | "email" | "name";
  duplicateWith?: string;
}

export function detectDuplicate(
  guest: { name: string; phone?: string | null; email?: string | null },
  existingPool: ExistingGuestIdentifier[]
): DuplicateDetectionResult {
  const normName = guest.name.trim().toLowerCase();
  const normPhone = guest.phone ? normalizePhoneNumber(guest.phone) : null;
  const normEmail = guest.email ? guest.email.trim().toLowerCase() : null;

  for (const existing of existingPool) {
    const exPhone = existing.phone
      ? normalizePhoneNumber(existing.phone)
      : null;
    const exEmail = existing.email ? existing.email.trim().toLowerCase() : null;
    const exName = existing.name.trim().toLowerCase();

    // 1. Phone match takes precedence
    if (normPhone && exPhone && normPhone === exPhone) {
      return {
        isDuplicate: true,
        matchType: "phone",
        duplicateWith: existing.name,
      };
    }

    // 2. Email match
    if (normEmail && exEmail && normEmail === exEmail) {
      return {
        isDuplicate: true,
        matchType: "email",
        duplicateWith: existing.name,
      };
    }

    // 3. Name match
    if (normName && exName && normName === exName) {
      return {
        isDuplicate: true,
        matchType: "name",
        duplicateWith: existing.name,
      };
    }
  }

  return { isDuplicate: false };
}
