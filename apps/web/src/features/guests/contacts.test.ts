import { describe, expect, it } from "vitest";
import { contactsToCsv, parseVcf } from "./contacts";
import { autoDetectColumnMapping } from "./csv-parser";

describe("contacts", () => {
  it("reads names, numbers and emails from a vCard export", () => {
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:Adeola Balogun",
      "TEL;TYPE=CELL:0802 345 6789",
      "EMAIL;TYPE=HOME:adeola@example.com",
      "END:VCARD",
      "BEGIN:VCARD",
      "N:Okafor;Emeka;;;",
      "item1.TEL:+2348039876543",
      "END:VCARD",
      "BEGIN:VCARD",
      "TEL:123",
      "END:VCARD",
    ].join("\r\n");
    expect(parseVcf(vcf)).toEqual([
      {
        name: "Adeola Balogun",
        phone: "0802 345 6789",
        email: "adeola@example.com",
      },
      { name: "Emeka Okafor", phone: "+2348039876543" },
    ]);
  });

  it("joins folded lines", () => {
    const vcf = "BEGIN:VCARD\nFN:A very long\n  name\nEND:VCARD";
    expect(parseVcf(vcf)[0].name).toBe("A very long name");
  });

  it("makes CSV the importer already understands", () => {
    const csv = contactsToCsv([
      { name: "Ada, Jr", phone: "0801", email: "a@x.co" },
      { name: "  " },
    ]);
    const headers = csv.split("\r\n")[0].split(",");
    const m = autoDetectColumnMapping(headers);
    expect(m.name).toBe("Full Name");
    expect(m.phone).toBe("Phone Number");
    expect(m.email).toBe("Email");
    expect(csv).toContain('"Ada, Jr"');
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});
