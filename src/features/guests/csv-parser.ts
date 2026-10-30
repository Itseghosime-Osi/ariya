import Papa from "papaparse";
import {
  guestRowSchema,
  detectDuplicate,
  type ValidatedGuestRow,
  type ExistingGuestIdentifier,
} from "./schemas";

export const MAX_IMPORT_ROWS = 500;
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export interface FieldMapping {
  name: string | null;
  phone: string | null;
  email: string | null;
  party_size: string | null;
  side: string | null;
  group_name: string | null;
  plus_ones_allowed: string | null;
  is_vip: string | null;
  notes: string | null;
}

export function autoDetectColumnMapping(headers: string[]): FieldMapping {
  const mapping: FieldMapping = {
    name: null,
    phone: null,
    email: null,
    party_size: null,
    side: null,
    group_name: null,
    plus_ones_allowed: null,
    is_vip: null,
    notes: null,
  };

  const patterns: Record<keyof FieldMapping, RegExp> = {
    name: /^(guest[\s_]?name|full[\s_]?name|name|guest|attendee)$/i,
    phone:
      /^(phone|mobile|cell|telephone|phone[\s_]?number|contact[\s_]?number|whatsapp)$/i,
    email: /^(email|email[\s_]?address|mail)$/i,
    party_size: /^(party[\s_]?size|pax|seats|party|count|tickets|allowance)$/i,
    side: /^(side|family[\s_]?side|affiliation|party[\s_]?side)$/i,
    group_name:
      /^(group|group[\s_]?name|category|table[\s_]?group|circle|cohort)$/i,
    plus_ones_allowed:
      /^(plus[\s_]?ones?|plus[\s_]?ones?[\s_]?allowed|\+1|allow[\s_]?plus[\s_]?one)$/i,
    is_vip: /^(vip|is[\s_]?vip|vip[\s_]?status|dignitary)$/i,
    notes: /^(notes?|remarks?|comments?|dietary)$/i,
  };

  for (const header of headers) {
    const cleanHeader = header.trim();
    for (const [key, pattern] of Object.entries(patterns) as [
      keyof FieldMapping,
      RegExp,
    ][]) {
      if (!mapping[key] && pattern.test(cleanHeader)) {
        mapping[key] = cleanHeader;
        break;
      }
    }
  }

  return mapping;
}

export interface CsvParseResult {
  headers: string[];
  totalRows: number;
  validRows: ValidatedGuestRow[];
  errorRows: {
    rowIndex: number;
    raw: Record<string, string>;
    errors: string[];
  }[];
  duplicateRows: {
    rowIndex: number;
    guest: ValidatedGuestRow;
    matchType: "phone" | "email" | "name";
    duplicateWith: string;
  }[];
}

export function parseGuestCsvContent(
  csvContent: string,
  mapping: FieldMapping,
  existingEventGuests: ExistingGuestIdentifier[] = []
): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvContent.trim(), {
    header: true,
    skipEmptyLines: "greedy",
  });

  const headers = parsed.meta.fields ?? [];
  const rawData = parsed.data.slice(0, MAX_IMPORT_ROWS);

  const validRows: ValidatedGuestRow[] = [];
  const errorRows: {
    rowIndex: number;
    raw: Record<string, string>;
    errors: string[];
  }[] = [];
  const duplicateRows: {
    rowIndex: number;
    guest: ValidatedGuestRow;
    matchType: "phone" | "email" | "name";
    duplicateWith: string;
  }[] = [];

  const seenInBatch: ExistingGuestIdentifier[] = [...existingEventGuests];

  rawData.forEach((row, idx) => {
    const rowIndex = idx + 1;

    const mappedObj: Record<string, unknown> = {
      name: mapping.name ? row[mapping.name] : undefined,
      phone: mapping.phone ? row[mapping.phone] : undefined,
      email: mapping.email ? row[mapping.email] : undefined,
      party_size: mapping.party_size ? row[mapping.party_size] : 1,
      side: mapping.side ? row[mapping.side] : "mutual",
      group_name: mapping.group_name ? row[mapping.group_name] : undefined,
      plus_ones_allowed: mapping.plus_ones_allowed
        ? /^(true|1|yes|y)$/i.test(
            String(row[mapping.plus_ones_allowed]).trim()
          )
        : false,
      is_vip: mapping.is_vip
        ? /^(true|1|yes|y)$/i.test(String(row[mapping.is_vip]).trim())
        : false,
      notes: mapping.notes ? row[mapping.notes] : undefined,
    };

    const validated = guestRowSchema.safeParse(mappedObj);

    if (!validated.success) {
      errorRows.push({
        rowIndex,
        raw: row,
        errors: validated.error.issues.map(
          (e) => `${e.path.join(".")}: ${e.message}`
        ),
      });
      return;
    }

    const guestData = validated.data;
    const dupCheck = detectDuplicate(guestData, seenInBatch);

    if (dupCheck.isDuplicate) {
      duplicateRows.push({
        rowIndex,
        guest: guestData,
        matchType: dupCheck.matchType!,
        duplicateWith: dupCheck.duplicateWith!,
      });
      return;
    }

    seenInBatch.push({
      name: guestData.name,
      phone: guestData.phone,
      email: guestData.email,
    });
    validRows.push(guestData);
  });

  return {
    headers,
    totalRows: rawData.length,
    validRows,
    errorRows,
    duplicateRows,
  };
}

export function mergeRemoteDuplicates(
  localResult: CsvParseResult,
  remoteDuplicates: {
    rowIndex: number;
    matchType: "phone" | "email" | "name";
    duplicateWith: string;
  }[]
): CsvParseResult {
  if (remoteDuplicates.length === 0) return localResult;
  const dupMap = new Map(remoteDuplicates.map((d) => [d.rowIndex, d]));
  const validRows: ValidatedGuestRow[] = [];
  const duplicateRows = [...localResult.duplicateRows];

  localResult.validRows.forEach((row, idx) => {
    const match = dupMap.get(idx + 1);
    if (match) {
      duplicateRows.push({
        rowIndex: idx + 1,
        guest: row,
        matchType: match.matchType,
        duplicateWith: match.duplicateWith,
      });
    } else {
      validRows.push(row);
    }
  });

  return { ...localResult, validRows, duplicateRows };
}
