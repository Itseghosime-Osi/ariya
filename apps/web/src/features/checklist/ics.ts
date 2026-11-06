import type { ChecklistTask } from "./types";

/**
 * The checklist as an iCalendar file (6.4.3): one all-day event per open task that has a due date.
 *
 * Deliberately one-way. A host imports this into the calendar they already use; nothing is ever
 * read back. Writing a task in Àríyá is the only way to change a date, which keeps one answer to
 * "what is due when".
 *
 * RFC 5545 is fussy in two places, and both bite real calendar apps: lines are CRLF-terminated and
 * folded at 75 octets, and the text properties escape backslash, semicolon and comma. An unescaped
 * comma in a task title silently truncates it in some clients.
 */

const CRLF = "\r\n";
const MAX_LINE_OCTETS = 75;

/** Escape a TEXT value (RFC 5545 §3.3.11). Newlines become the literal `\n` sequence. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Fold one content line to 75 octets, continuation lines starting with a single space (§3.1).
 *
 * Measured in UTF-8 bytes, not characters, and never split inside a multi-byte character: a
 * folded "Àríyá" split mid-codepoint is a corrupt file rather than a wrapped one.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= MAX_LINE_OCTETS) return line;

  const out: string[] = [];
  let current = "";
  let octets = 0;
  // Continuation lines spend one octet on the leading space, so they carry 74 of content.
  let budget = MAX_LINE_OCTETS;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (octets + size > budget) {
      out.push(current);
      current = "";
      octets = 0;
      budget = MAX_LINE_OCTETS - 1;
    }
    current += char;
    octets += size;
  }
  out.push(current);

  return out.map((part, i) => (i === 0 ? part : ` ${part}`)).join(CRLF);
}

/** `YYYYMMDD` from a stored `date` column, which is already a bare calendar date. */
function dateValue(isoDate: string): string {
  return isoDate.slice(0, 10).replace(/-/g, "");
}

/** A UTC timestamp for DTSTAMP. Passed in so the builder stays pure and testable. */
function stamp(at: Date): string {
  return `${at.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
}

export interface IcsOptions {
  /** The event's name, used in the calendar's display name. */
  calendarName: string;
  /** The moment the file was produced, for DTSTAMP. */
  now: Date;
}

/**
 * Build the calendar. Only open tasks with a due date are included: a finished task is not
 * something to be reminded of, and a task with no date would give the calendar an entry that
 * means nothing.
 */
export function buildChecklistIcs(
  tasks: ChecklistTask[],
  options: IcsOptions
): string {
  const dated = tasks.filter(
    (t) => t.dueDate && t.status !== "done" && t.status !== "skipped"
  );
  const dtstamp = stamp(options.now);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ariya//Celebration Suite//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(options.calendarName)}`,
  ];

  for (const task of dated) {
    const day = dateValue(task.dueDate!);
    const description = [task.detail, task.mitigation, task.adviceSource]
      .filter((part): part is string => Boolean(part))
      .join("\n\n");

    lines.push(
      "BEGIN:VEVENT",
      // Stable per task, so re-importing updates the entry instead of duplicating it.
      `UID:${task.id}@ariya`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${day}`,
      `SUMMARY:${escapeText(task.title)}`,
      ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
      "TRANSP:TRANSPARENT",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** The filename a host sees when they save the file. */
export function icsFilename(eventTitle: string): string {
  const slug =
    eventTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "event";
  return `${slug}-checklist.ics`;
}
