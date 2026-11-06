import { describe, expect, it } from "vitest";
import {
  createTableSchema,
  updateTableSchema,
  assignSeatInputSchema,
  hallLayoutSchema,
  MAX_HALL_LAYOUT_BYTES,
  HALL_MAX_ZONES,
  HALL_MAX_CHAIRS,
  HALL_MAX_GROUPS,
  HALL_MAX_STAGE_ITEMS,
  HALL_MAX_TABLE_STYLES,
} from "./schemas";

describe("Seating schemas", () => {
  it("validates table creation input correctly", () => {
    const valid = createTableSchema.safeParse({
      name: "VIP Table 1",
      capacity: 10,
      shape: "round",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.position_x).toBe(0);
      expect(valid.data.position_y).toBe(0);
    }

    const invalidCapacity = createTableSchema.safeParse({
      name: "Table 2",
      capacity: 0,
      shape: "round",
    });
    expect(invalidCapacity.success).toBe(false);

    const invalidName = createTableSchema.safeParse({
      name: "",
      capacity: 8,
      shape: "rectangular",
    });
    expect(invalidName.success).toBe(false);
  });

  it("validates table updates correctly", () => {
    const partial = updateTableSchema.safeParse({
      name: "Bride's Family Table",
      capacity: 12,
    });
    expect(partial.success).toBe(true);

    const overCapacity = updateTableSchema.safeParse({
      capacity: 51,
    });
    expect(overCapacity.success).toBe(false);
  });

  it("validates seat assignment correctly", () => {
    const assignToTable = assignSeatInputSchema.safeParse({
      guestId: "c4b14d82-c283-490b-be8e-fdb1681283c4",
      tableId: "1c3228f4-6bb2-4f36-a36c-9a4c14352b21",
    });
    expect(assignToTable.success).toBe(true);

    const unseat = assignSeatInputSchema.safeParse({
      guestId: "c4b14d82-c283-490b-be8e-fdb1681283c4",
      tableId: null,
    });
    expect(unseat.success).toBe(true);

    const invalidUuid = assignSeatInputSchema.safeParse({
      guestId: "not-a-uuid",
      tableId: null,
    });
    expect(invalidUuid.success).toBe(false);
  });
});

describe("Hall layout size", () => {
  /** A deterministic uuid, so the fixture is stable and the byte count is reproducible. */
  const uuid = (n: number) =>
    `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

  /**
   * A layout at every documented maximum at once: the worst case the validator will ever accept.
   * If this fits, no layout a host can build can exceed the column's 64 KB guard.
   */
  function maximalLayout() {
    const zones = Array.from({ length: HALL_MAX_ZONES }, (_, i) => ({
      id: `zone-${i}`,
      kind: "custom" as const,
      label: `Custom item number ${i}`,
      x: 10 + i,
      y: 10 + i,
      w: 1.8,
      h: 0.9,
      shape: "rect" as const,
      rot: 0,
      color: "#e9c98a",
      finish: "gloss" as const,
      height: 0.75,
      variant: "table" as const,
    }));
    const chairs = Array.from({ length: HALL_MAX_CHAIRS }, (_, i) => ({
      id: `chair-${i}`,
      x: 1 + (i % 40),
      y: 1 + Math.floor(i / 40),
      rot: 0,
      chair: "chiavari-gold" as const,
      seat: "guest" as const,
      seats: 1,
    }));
    const groups = Array.from({ length: HALL_MAX_GROUPS }, (_, i) => ({
      id: `group-${i}`,
      name: `Group number ${i}`,
      items: [
        { type: "chair" as const, id: `chair-${i * 2}` },
        { type: "chair" as const, id: `chair-${i * 2 + 1}` },
      ],
    }));
    const stageItems = Array.from({ length: HALL_MAX_STAGE_ITEMS }, (_, i) => ({
      id: `stage-item-${i}`,
      stageId: "zone-0",
      kind: "podium" as const,
      across: 0,
      depth: 0.5,
      label: `Stage item ${i}`,
    }));
    const rotations: Record<string, number> = {};
    const tableStyles: Record<string, { cloth: string; chair: "ghost" }> = {};
    for (let i = 0; i < HALL_MAX_TABLE_STYLES; i++) {
      rotations[uuid(i)] = 45;
      tableStyles[uuid(i)] = { cloth: "#6e1426", chair: "ghost" };
    }
    return {
      version: 2 as const,
      venue: {
        type: "marquee" as const,
        environment: "covered" as const,
        structure: {
          clearspan: 20,
          legModule: 3,
          designWindMph: 60,
          anchoring: "Ground stakes every leg",
          floor: "Decking on grass",
        },
        services: {
          power: "3-phase generator",
          generatorKva: 60,
          water: "Tanker",
          toilets: 8,
          parking: 120,
        },
        capacity: { certified: 400, source: "Venue certificate" },
        climate: { city: "Lagos", month: 11, outdoorC: 31, rh: 78 },
        cooling: {
          units: Array.from({ length: 32 }, (_, i) => ({
            id: `ac-${i}`,
            x: i,
            y: i,
            hp: 2.5,
            mount: "wall" as const,
            inverter: true,
          })),
          ach: 8,
          targetC: 24,
        },
        catering: {
          style: "buffet" as const,
          hours: 5,
          alcohol: "beer-wine" as const,
          cake: "dessert" as const,
          takeaway: true,
          plusOnes: 0.2,
          vendors: 20,
          overage: 0.1,
          coldDisplay: true,
          hotWeather: true,
        },
        sun: null,
      },
      width: 30,
      length: 20,
      zones,
      decor: {
        linen: "#6e1426",
        sash: "#e9c98a",
        chair: "chiavari-gold" as const,
        cover: "#f4efe6",
        centrepiece: "tall" as const,
        flower: "#f4efe6",
        uplight: "#f2b45c",
        drape: "#f4efe6",
        floor: "marble" as const,
        wall: "#efe7da",
      },
      spacing: "comfortable" as const,
      rotations,
      tableStyles,
      chairs,
      groups,
      stageItems,
      mood: "evening" as const,
      chandeliers: true,
      ceiling: 5,
    };
  }

  it("a layout at every maximum still fits the 64 KB column", () => {
    const layout = maximalLayout();
    const parsed = hallLayoutSchema.safeParse(layout);
    if (!parsed.success) {
      throw new Error(
        `Rejected at ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`
      );
    }

    const bytes = new TextEncoder().encode(JSON.stringify(parsed.data)).length;
    expect(bytes).toBeLessThan(MAX_HALL_LAYOUT_BYTES);
  });
});
