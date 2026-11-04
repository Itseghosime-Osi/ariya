import { z } from "zod";

/** A browser's Web Push subscription, as PushSubscription.toJSON() gives it. */
export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .url()
    .max(2048)
    .refine((u) => u.startsWith("https://"), "Push endpoint must be https"),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(64),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
