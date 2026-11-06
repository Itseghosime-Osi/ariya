import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getChecklistData } from "@/features/checklist/queries";
import type { ChecklistTask } from "@/features/checklist/types";

/**
 * The run sheet for the day itself (6.4.4): the day-phase rows in the order they happen, with the
 * time slot the generator wrote for each.
 *
 * It reads the checklist rather than a table of its own. A run sheet that could disagree with the
 * checklist would be worse than no run sheet, and the host already ticks these rows there.
 */

export interface RunSheetRow {
  id: string;
  title: string;
  /** "Morning, before load-in", "16:00" — whatever the template wrote. */
  timeSlot: string | null;
  detail: string | null;
  status: ChecklistTask["status"];
  /** A stop that cannot move, rather than a job that can drift. */
  isHardStop: boolean;
}

/** A person to ring on the day: the vendor's own contact, if they gave one. */
export interface RunSheetContact {
  id: string;
  /** The business, e.g. "Mama Titi Catering". */
  name: string;
  /** Who to ask for, when it is not simply the business name. */
  person: string | null;
  phone: string | null;
  email: string | null;
}

export interface RunSheetData {
  eventId: string;
  eventTitle: string;
  eventDate: string | null;
  /** Rows with a time slot first, in slot order; the rest after, in their template order. */
  rows: RunSheetRow[];
  doneCount: number;
  /** Only vendors that gave a phone or an email; a name alone cannot be reached on the day. */
  contacts: RunSheetContact[];
}

/**
 * Time slots are written in words, so ordering them is a judgement rather than a sort on a
 * timestamp. The template already lists day rows in the order they happen (`SORT_ORDER`), so array
 * order is the truth and a slot is displayed, not sorted on — except that a row the template gave
 * no slot stays behind the ones that have one.
 */
export async function getRunSheetData(
  eventId: string
): Promise<RunSheetData | null> {
  const data = await getChecklistData(eventId);
  if (!data) return null;

  const dayRows = data.tasks.filter((t) => t.phase === "day");

  const rows: RunSheetRow[] = dayRows
    .map((t) => ({
      id: t.id,
      title: t.title,
      timeSlot: t.timeSlot,
      detail: t.detail,
      status: t.status,
      isHardStop: /hard stop/i.test(t.title),
    }))
    .sort((a, b) => {
      if (Boolean(a.timeSlot) !== Boolean(b.timeSlot))
        return a.timeSlot ? -1 : 1;
      return 0;
    });

  const contacts = await getRunSheetContacts(eventId);

  return {
    eventId: data.event.id,
    eventTitle: data.event.title,
    eventDate: data.event.date,
    rows,
    doneCount: rows.filter((r) => r.status === "done").length,
    contacts,
  };
}

/**
 * The vendors to ring on the day, in the order they were added.
 *
 * Filtered to those with a phone or an email: a row that says only "DJ Ade" is a name the host
 * already knows, and listing it as a contact would pad the sheet without helping at the moment it
 * is opened.
 */
async function getRunSheetContacts(
  eventId: string
): Promise<RunSheetContact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, name, contact_name, contact_phone, contact_email")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getRunSheetContacts] Database error loading vendors:", {
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? [])
    .filter((v) => v.contact_phone || v.contact_email)
    .map((v) => ({
      id: v.id,
      name: v.name,
      person: v.contact_name,
      phone: v.contact_phone,
      email: v.contact_email,
    }));
}
