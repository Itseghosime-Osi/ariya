import Papa from "papaparse";
import { MAX_IMPORT_ROWS } from "./csv-parser";

/** One person from a phone's address book or a .vcf file. */
export interface PickedContact {
  name: string;
  phone?: string;
  email?: string;
}

/** The headers the importer's own auto-detect already recognises. */
export const CONTACT_CSV_HEADERS = ["Full Name", "Phone Number", "Email"];

/** Contacts as CSV text, so they go through the same mapping, checks and duplicate finder as a file. */
export function contactsToCsv(contacts: PickedContact[]): string {
  const rows = contacts
    .filter((c) => c.name.trim())
    .slice(0, MAX_IMPORT_ROWS)
    .map((c) => [c.name.trim(), c.phone?.trim() ?? "", c.email?.trim() ?? ""]);
  return Papa.unparse({ fields: CONTACT_CSV_HEADERS, data: rows });
}

interface PickerResult {
  name?: string[];
  tel?: string[];
  email?: string[];
}

/** The address book picker exists only in some mobile browsers (Chrome on Android). */
export function canPickContacts(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    contacts?: { select?: unknown };
  };
  return typeof nav.contacts?.select === "function";
}

/** Opens the phone's own contact list. Resolves to nothing if the person cancels. */
export async function pickContacts(): Promise<PickedContact[]> {
  const nav = navigator as Navigator & {
    contacts: {
      select: (
        props: string[],
        opts: { multiple: boolean }
      ) => Promise<PickerResult[]>;
    };
  };
  const picked = await nav.contacts.select(["name", "tel", "email"], {
    multiple: true,
  });
  return picked
    .map((p) => ({
      name: p.name?.[0]?.trim() ?? "",
      phone: p.tel?.[0],
      email: p.email?.[0],
    }))
    .filter((c) => c.name);
}

function unfold(text: string): string[] {
  // vCard folds a long line by starting the next one with a space or tab.
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

/** Reads a .vcf export (iPhone, Android, Google, Outlook). Unreadable cards are skipped. */
export function parseVcf(text: string): PickedContact[] {
  const out: PickedContact[] = [];
  let cur: PickedContact | null = null;
  let structured = "";
  for (const raw of unfold(text)) {
    const line = raw.trim();
    const upper = line.toUpperCase();
    if (upper === "BEGIN:VCARD") {
      cur = { name: "" };
      structured = "";
      continue;
    }
    if (upper === "END:VCARD") {
      if (cur) {
        if (!cur.name && structured) cur.name = structured;
        if (cur.name) out.push(cur);
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line
      .slice(0, colon)
      .split(";")[0]
      .toUpperCase()
      .replace(/^ITEM\d+\./, "");
    const value = line.slice(colon + 1).trim();
    if (key === "FN" && !cur.name) cur.name = value;
    else if (key === "N" && !structured) {
      const [family, given] = value.split(";");
      structured = [given, family].filter(Boolean).join(" ").trim();
    } else if (key === "TEL" && !cur.phone) cur.phone = value;
    else if (key === "EMAIL" && !cur.email) cur.email = value;
  }
  return out.slice(0, MAX_IMPORT_ROWS);
}
