import { describe, it, expect } from "vitest";
import {
  autoDetectColumnMapping,
  parseGuestCsvContent,
  mergeRemoteDuplicates,
  MAX_IMPORT_ROWS,
} from "./csv-parser";
import { detectDuplicate } from "./schemas";

describe("autoDetectColumnMapping", () => {
  it("detects standard headers correctly", () => {
    const headers = [
      "Full Name",
      "Phone Number",
      "Email Address",
      "Party Size",
      "Side",
      "Group",
      "VIP",
      "Plus Ones",
      "Notes",
    ];
    const mapping = autoDetectColumnMapping(headers);

    expect(mapping.name).toBe("Full Name");
    expect(mapping.phone).toBe("Phone Number");
    expect(mapping.email).toBe("Email Address");
    expect(mapping.party_size).toBe("Party Size");
    expect(mapping.side).toBe("Side");
    expect(mapping.group_name).toBe("Group");
    expect(mapping.is_vip).toBe("VIP");
    expect(mapping.plus_ones_allowed).toBe("Plus Ones");
    expect(mapping.notes).toBe("Notes");
  });

  it("handles alternative Nigerian owambe column conventions", () => {
    const headers = ["Guest", "WhatsApp", "Mail", "Pax", "Cohort"];
    const mapping = autoDetectColumnMapping(headers);

    expect(mapping.name).toBe("Guest");
    expect(mapping.phone).toBe("WhatsApp");
    expect(mapping.email).toBe("Mail");
    expect(mapping.party_size).toBe("Pax");
    expect(mapping.group_name).toBe("Cohort");
  });
});

describe("detectDuplicate", () => {
  const existingPool = [
    {
      name: "Chief Femi Adeleke",
      phone: "+2348031234567",
      email: "femi@example.com",
    },
    {
      name: "Folake Balogun",
      phone: "+2348099998888",
      email: "folake@example.com",
    },
  ];

  it("flags duplicate by normalised phone even with different local formatting", () => {
    const result = detectDuplicate(
      { name: "Different Name", phone: "0803 123 4567" },
      existingPool
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.matchType).toBe("phone");
    expect(result.duplicateWith).toBe("Chief Femi Adeleke");
  });

  it("flags duplicate by email case-insensitively", () => {
    const result = detectDuplicate(
      { name: "Another Name", email: "FEMI@EXAMPLE.COM" },
      existingPool
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.matchType).toBe("email");
  });

  it("flags duplicate by trimmed name case-insensitively", () => {
    const result = detectDuplicate(
      { name: "  chief femi adeleke  " },
      existingPool
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.matchType).toBe("name");
  });

  it("allows non-matching guests", () => {
    const result = detectDuplicate(
      {
        name: "Babajide Sanwo",
        phone: "+2348022223333",
        email: "jide@example.com",
      },
      existingPool
    );
    expect(result.isDuplicate).toBe(false);
  });
});

describe("parseGuestCsvContent", () => {
  const validCsv = `
Name,Phone,Email,Seats,Side,Group,VIP
Chief Adeleke,08031234567,adeleke@example.com,2,groom,Family,yes
Folake Martins,+234 809 111 2222,folake@example.com,1,bride,Friends,no
Uncle Segun,08023456789,,4,mutual,Elders,yes
`.trim();

  it("parses valid CSV rows with auto normalisation", () => {
    const mapping = {
      name: "Name",
      phone: "Phone",
      email: "Email",
      party_size: "Seats",
      side: "Side",
      group_name: "Group",
      plus_ones_allowed: null,
      is_vip: "VIP",
      notes: null,
    };

    const res = parseGuestCsvContent(validCsv, mapping);

    expect(res.totalRows).toBe(3);
    expect(res.validRows.length).toBe(3);
    expect(res.errorRows.length).toBe(0);
    expect(res.duplicateRows.length).toBe(0);

    const first = res.validRows[0];
    expect(first.name).toBe("Chief Adeleke");
    expect(first.phone).toBe("+2348031234567");
    expect(first.email).toBe("adeleke@example.com");
    expect(first.party_size).toBe(2);
    expect(first.side).toBe("groom");
    expect(first.group_name).toBe("Family");
    expect(first.is_vip).toBe(true);
  });

  it("catches row validation errors", () => {
    const invalidCsv = `
Name,Phone,Email,Seats
,08031234567,valid@example.com,2
John Doe,08012345678,not-an-email,1
Jane Doe,08099998888,jane@example.com,50
`.trim();

    const mapping = {
      name: "Name",
      phone: "Phone",
      email: "Email",
      party_size: "Seats",
      side: null,
      group_name: null,
      plus_ones_allowed: null,
      is_vip: null,
      notes: null,
    };

    const res = parseGuestCsvContent(invalidCsv, mapping);

    expect(res.validRows.length).toBe(0);
    expect(res.errorRows.length).toBe(3);
    expect(res.errorRows[0].errors[0]).toContain("Guest name is required");
    expect(res.errorRows[1].errors[0]).toContain("Invalid email address");
    expect(res.errorRows[2].errors[0]).toContain("cannot exceed 20");
  });

  it("detects intra-batch duplicates", () => {
    const dupCsv = `
Name,Phone,Email
Guest One,08031234567,one@example.com
Guest Two,08031234567,two@example.com
Guest Three,08055556666,one@example.com
`.trim();

    const mapping = {
      name: "Name",
      phone: "Phone",
      email: "Email",
      party_size: null,
      side: null,
      group_name: null,
      plus_ones_allowed: null,
      is_vip: null,
      notes: null,
    };

    const res = parseGuestCsvContent(dupCsv, mapping);

    expect(res.validRows.length).toBe(1);
    expect(res.duplicateRows.length).toBe(2);
    expect(res.duplicateRows[0].matchType).toBe("phone");
    expect(res.duplicateRows[1].matchType).toBe("email");
  });

  it("enforces max import rows limit", () => {
    const rows = ["Name,Phone"];
    for (let i = 0; i < MAX_IMPORT_ROWS + 50; i++) {
      rows.push(`Guest ${i},0801000${i.toString().padStart(4, "0")}`);
    }
    const longCsv = rows.join("\n");

    const mapping = {
      name: "Name",
      phone: "Phone",
      email: null,
      party_size: null,
      side: null,
      group_name: null,
      plus_ones_allowed: null,
      is_vip: null,
      notes: null,
    };

    const res = parseGuestCsvContent(longCsv, mapping);
    expect(res.totalRows).toBe(MAX_IMPORT_ROWS);
  });
});

describe("mergeRemoteDuplicates", () => {
  it("moves matched rows from validRows to duplicateRows", () => {
    const localResult = {
      headers: ["name", "phone"],
      totalRows: 2,
      validRows: [
        {
          name: "Guest One",
          phone: null,
          email: null,
          party_size: 1,
          side: "bride" as const,
          group_name: null,
          is_vip: false,
          plus_ones_allowed: false,
          notes: null,
        },
        {
          name: "Guest Two",
          phone: null,
          email: null,
          party_size: 1,
          side: "bride" as const,
          group_name: null,
          is_vip: false,
          plus_ones_allowed: false,
          notes: null,
        },
      ],
      errorRows: [],
      duplicateRows: [],
    };

    const remoteDups = [
      {
        rowIndex: 1,
        matchType: "name" as const,
        duplicateWith: "Existing Guest One",
      },
    ];

    const merged = mergeRemoteDuplicates(localResult, remoteDups);
    expect(merged.validRows).toHaveLength(1);
    expect(merged.validRows[0].name).toBe("Guest Two");
    expect(merged.duplicateRows).toHaveLength(1);
    expect(merged.duplicateRows[0].guest.name).toBe("Guest One");
    expect(merged.duplicateRows[0].matchType).toBe("name");
  });
});
