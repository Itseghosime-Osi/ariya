import { describe, expect, it } from "vitest";
import { buildChecklistIcs, escapeText, foldLine, icsFilename } from "./ics";
import type { ChecklistTask } from "./types";

function task(overrides: Partial<ChecklistTask> = {}): ChecklistTask {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Sign the venue contract",
    detail: "Confirm capacity and access times.",
    phase: "foundations",
    dueDate: "2026-04-16",
    status: "todo",
    ownerId: null,
    source: "template",
    sourceKey: "foundations.venue-contract",
    derivation: null,
    mitigation: null,
    adviceSource: null,
    timeSlot: null,
    sort: 3,
    completedAt: null,
    ...overrides,
  };
}

const NOW = new Date("2026-11-06T10:00:00Z");

describe("escapeText", () => {
  it("escapes the characters RFC 5545 reserves", () => {
    expect(escapeText("a, b; c\\ d")).toBe("a\\, b\\; c\\\\ d");
  });

  it("turns a newline into the literal backslash-n", () => {
    expect(escapeText("first\nsecond")).toBe("first\\nsecond");
  });
});

describe("foldLine", () => {
  it("leaves a short line alone", () => {
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("folds past 75 octets onto continuation lines starting with a space", () => {
    const folded = foldLine(`DESCRIPTION:${"a".repeat(200)}`);
    const lines = folded.split("\r\n");

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines.slice(1)) {
      expect(line.startsWith(" ")).toBe(true);
    }
    for (const line of lines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    // Nothing is lost in the fold.
    expect(lines.join("").replace(/ /g, "")).toBe(
      `DESCRIPTION:${"a".repeat(200)}`
    );
  });

  it("counts octets, not characters, and never splits a multi-byte character", () => {
    // "à" is two octets in UTF-8, so 60 of them already exceed 75 octets.
    const folded = foldLine(`X:${"à".repeat(60)}`);
    const lines = folded.split("\r\n");

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(lines.join("").replace(/ /g, "")).toBe(`X:${"à".repeat(60)}`);
    expect(folded).not.toContain("�");
  });
});

describe("buildChecklistIcs", () => {
  it("wraps the events in one calendar with CRLF line endings", () => {
    const ics = buildChecklistIcs([task()], {
      calendarName: "Kemi & Tunde",
      now: NOW,
    });

    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).not.toMatch(/(?<!\r)\n/);
  });

  it("emits one all-day event per dated task", () => {
    const ics = buildChecklistIcs([task(), task({ id: "b" })], {
      calendarName: "Kemi & Tunde",
      now: NOW,
    });

    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260416");
    expect(ics).toContain("DTSTAMP:20261106T100000Z");
    expect(ics).toContain("UID:11111111-1111-4111-8111-111111111111@ariya");
  });

  it("leaves out tasks that are done, skipped or undated", () => {
    const ics = buildChecklistIcs(
      [
        task({ id: "a" }),
        task({ id: "b", status: "done" }),
        task({ id: "c", status: "skipped" }),
        task({ id: "d", dueDate: null }),
      ],
      { calendarName: "Kemi & Tunde", now: NOW }
    );

    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("UID:a@ariya");
  });

  it("escapes a title that would otherwise truncate in a calendar app", () => {
    const ics = buildChecklistIcs(
      [task({ title: "Book hall, caterer; drinks" })],
      { calendarName: "Kemi & Tunde", now: NOW }
    );

    expect(ics).toContain("SUMMARY:Book hall\\, caterer\\; drinks");
  });

  it("carries the advice and its source into the description", () => {
    const ics = buildChecklistIcs(
      [
        task({
          mitigation: "Hold a 5–10 % buffer.",
          adviceSource: "Research §D.1–D.2",
        }),
      ],
      { calendarName: "Kemi & Tunde", now: NOW }
    );

    expect(ics).toContain("Hold a 5–10 % buffer.");
    expect(ics).toContain("Research §D.1–D.2");
  });

  it("omits DESCRIPTION when a task has nothing to say", () => {
    const ics = buildChecklistIcs(
      [task({ detail: null, mitigation: null, adviceSource: null })],
      { calendarName: "Kemi & Tunde", now: NOW }
    );

    expect(ics).not.toContain("DESCRIPTION");
  });
});

describe("icsFilename", () => {
  it("slugifies the event name", () => {
    expect(icsFilename("Kemi & Tunde 1701")).toBe(
      "kemi-tunde-1701-checklist.ics"
    );
  });

  it("falls back when the title has nothing usable", () => {
    expect(icsFilename("!!!")).toBe("event-checklist.ics");
  });
});
