"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  eventId: z.string().uuid(),
  kind: z.enum(["opened", "export_ok", "export_failed", "error"]),
  format: z.enum(["png", "jpeg", "pdf", "json", "whatsapp"]).optional(),
  ms: z.number().int().min(0).max(86_400_000).optional(),
});

type MetricsTable = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
  };
};

/**
 * Records one anonymous studio metric. It never throws and never blocks the studio: a missing
 * table (migration not applied yet), a signed-out person or a network blip just drops the row.
 */
export async function recordStudioMetricAction(
  input: z.input<typeof schema>
): Promise<{ ok: boolean }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false };
  try {
    const supabase = (await createClient()) as unknown as MetricsTable;
    const { error } = await supabase.from("studio_metrics").insert({
      event_id: parsed.data.eventId,
      kind: parsed.data.kind,
      format: parsed.data.format ?? null,
      ms: parsed.data.ms ?? null,
    });
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
