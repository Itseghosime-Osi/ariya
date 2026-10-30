import { z } from "zod";

export const reminderFilterEnum = z.enum(["awaiting", "no_email", "all"]);

export const sendBatchReminderSchema = z.object({
  filter: reminderFilterEnum.default("awaiting"),
  subject: z.string().min(1, "Subject line is required").max(150),
  customMessage: z.string().max(1000).optional(),
  selectedGuestIds: z.array(z.guid()).optional(),
});

export type SendBatchReminderInput = z.infer<typeof sendBatchReminderSchema>;
