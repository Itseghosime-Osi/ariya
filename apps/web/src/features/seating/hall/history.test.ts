import { describe, expect, it, vi } from "vitest";

vi.mock("../actions", () => ({ saveHallLayoutAction: vi.fn() }));

import { defaultLayout } from "./model";
import { describeChange } from "./useHallLayout";

describe("describeChange", () => {
  const base = defaultLayout(30, 20);

  it("names a resize with the new size", () => {
    expect(describeChange(base, { ...base, width: 32 })).toBe(
      "Resized the room to 32 × 20 m"
    );
  });

  it("names areas, rules, turns and décor", () => {
    expect(describeChange(base, { ...base, zones: base.zones.slice(1) })).toBe(
      "Removed an area"
    );
    expect(
      describeChange(base, {
        ...base,
        seatRules: [
          {
            id: "r",
            kind: "apart",
            guestIds: [
              "00000000-0000-4000-8000-000000000001",
              "00000000-0000-4000-8000-000000000002",
            ],
          },
        ],
      })
    ).toBe("Added a seating rule");
    expect(describeChange(base, { ...base, rotations: { t1: 45 } })).toBe(
      "Turned tables"
    );
    expect(
      describeChange(base, {
        ...base,
        decor: { ...base.decor, linen: "#000000" },
      })
    ).toBe("Changed the décor");
  });

  it("falls back to a plain description", () => {
    expect(describeChange(base, { ...base })).toBe("Edited the hall");
  });
});
