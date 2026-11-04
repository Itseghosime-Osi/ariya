import { describe, expect, it } from "vitest";
import { previewFromStored } from "./previews";
import {
  TABLES,
  TABLE_1,
  TABLE_2,
  guest,
  hallLayout,
  payloadOf,
  uuid,
  zone,
} from "./fixtures";
import type { HallPreview, SeatingPreview } from "./types";

/**
 * What a host is shown before they approve: the sentences a room change produces, the problems the
 * designer would still raise, and who would sit where. The fixture is a room the designer accepts,
 * so every test here changes exactly one thing.
 */

function hallPreview(
  payload: unknown,
  layout = hallLayout(),
  tables = TABLES
): HallPreview {
  const preview = previewFromStored("apply_hall_layout", payload, {
    layout,
    tables,
    guests: [],
  });

  if (!preview || preview.kind !== "hall") {
    throw new Error("The room preview could not be built.");
  }
  return preview;
}

function seatingPreview(input: {
  assignments: { guestId: string; tableId: string }[];
  guests: ReturnType<typeof guest>[];
  mode?: "fill_unseated" | "rearrange";
  tables?: typeof TABLES;
}): SeatingPreview {
  const preview = previewFromStored(
    "apply_seating_plan",
    {
      assignments: input.assignments,
      ...(input.mode ? { mode: input.mode } : {}),
    },
    { layout: null, tables: input.tables ?? TABLES, guests: input.guests }
  );

  if (!preview || preview.kind !== "seating") {
    throw new Error("The seating preview could not be built.");
  }
  return preview;
}

describe("the room a hall proposal would make", () => {
  it("is a room the designer accepts, and says nothing changed when nothing has", () => {
    const layout = hallLayout();
    const preview = hallPreview(payloadOf(layout), layout);

    expect(preview.changes).toEqual([
      "The room is the same as the one you have now.",
    ]);
    expect(preview.problems).toEqual([]);
  });

  it("names a zone the plan adds", () => {
    const layout = hallLayout();
    const added = {
      ...layout,
      zones: [...layout.zones, zone("cake", { x: 26, y: 17 })],
    };
    const preview = hallPreview(payloadOf(added), layout);

    expect(preview.changes).toContain("Adds a cake (1.5 m × 1.5 m).");
  });

  it("names a zone the plan takes away", () => {
    const layout = hallLayout();
    const without = {
      ...layout,
      zones: layout.zones.filter((item) => item.kind !== "buffet"),
    };
    const preview = hallPreview(payloadOf(without), layout);

    expect(preview.changes).toContain("Removes the buffet.");
  });

  it("counts the tables that move, and how far the furthest goes", () => {
    const layout = hallLayout();
    const preview = hallPreview(
      payloadOf(layout, [{ ...TABLES[0], x: 1200 }, TABLES[1]]),
      layout
    );

    expect(preview.changes).toContain(
      "1 table moves on the floor plan, the furthest by 2 m."
    );
  });

  it("raises the designer's objection when two tables sit on top of each other", () => {
    const layout = hallLayout();
    const preview = hallPreview(
      payloadOf(layout, [
        { ...TABLES[0], x: 1200 },
        { ...TABLES[1], x: 1200 },
      ]),
      layout
    );

    expect(preview.problems).toContain(
      "Table “Table 1” overlaps table “Table 2”."
    );
  });

  it("raises it when a table has been put outside the hall", () => {
    const layout = hallLayout();
    const preview = hallPreview(
      payloadOf(layout, [{ ...TABLES[0], x: 100, y: 100 }, TABLES[1]]),
      layout
    );

    expect(preview.problems.join(" ")).toContain(
      "Table “Table 1” reaches outside the hall."
    );
  });

  it("raises it when a table is parked across the main aisle", () => {
    const layout = hallLayout();
    const middle = {
      id: uuid(3),
      name: "Table 3",
      capacity: 8,
      shape: "round",
      x: 1500,
      y: 1700,
    };
    const tables = [...TABLES, middle];
    const preview = hallPreview(payloadOf(layout, tables), layout, tables);

    expect(preview.problems).toContain(
      "Table “Table 3” blocks the main aisle down the middle of the hall, which has tables on both sides of it."
    );
  });

  it("raises it when the plan places a table this celebration does not have", () => {
    const layout = hallLayout();
    const payload = payloadOf(layout);
    payload.tablePositions = [
      ...(payload.tablePositions ?? []),
      { id: uuid(77), x: 1500, y: 1700 },
    ];
    const preview = hallPreview(payload, layout);

    expect(preview.problems).toContain(
      `Table ${uuid(77)} is not on this celebration.`
    );
  });
});

describe("who a seating proposal would sit where", () => {
  const seatedAtTableOne = guest(2, { tableId: TABLE_1 });
  const seatedAtTableTwo = guest(3, { tableId: TABLE_2 });
  const unseated = guest(1);

  it("counts the guests it seats, the ones it moves, and the ones it leaves", () => {
    const preview = seatingPreview({
      mode: "rearrange",
      guests: [unseated, seatedAtTableOne, seatedAtTableTwo],
      assignments: [
        { guestId: unseated.id, tableId: TABLE_1 },
        { guestId: seatedAtTableOne.id, tableId: TABLE_2 },
        { guestId: seatedAtTableTwo.id, tableId: TABLE_2 },
      ],
    });

    expect(preview.seatedCount).toBe(1);
    expect(preview.movedCount).toBe(1);
    expect(preview.unchangedCount).toBe(1);
  });

  it("lists every move with the table it leaves and the table it joins", () => {
    const preview = seatingPreview({
      mode: "rearrange",
      guests: [seatedAtTableOne],
      assignments: [{ guestId: seatedAtTableOne.id, tableId: TABLE_2 }],
    });

    expect(preview.moves).toEqual([
      {
        guestId: seatedAtTableOne.id,
        name: "Guest 2",
        fromTable: "Table 1",
        toTable: "Table 2",
      },
    ]);
  });

  it("says a guest the app named is no longer on the celebration", () => {
    const preview = seatingPreview({
      guests: [unseated],
      assignments: [{ guestId: uuid(999), tableId: TABLE_1 }],
    });

    expect(preview.missing).toEqual([{ guestId: uuid(999), name: null }]);
  });

  it("warns when a table would hold more than it seats", () => {
    const large = guest(4, { partySize: 3, tableId: TABLE_1 });
    const newcomer = guest(5);
    const preview = seatingPreview({
      guests: [large, newcomer],
      assignments: [{ guestId: newcomer.id, tableId: TABLE_2 }],
      tables: [{ ...TABLES[0], capacity: 2 }, TABLES[1]],
    });

    expect(preview.warnings).toContain(
      "“Table 1” would hold 3 guests but seats 2."
    );
  });

  it("flags a fill_unseated plan that would touch a guest who is already seated", () => {
    const preview = seatingPreview({
      mode: "fill_unseated",
      guests: [seatedAtTableOne],
      assignments: [{ guestId: seatedAtTableOne.id, tableId: TABLE_2 }],
    });

    expect(preview.warnings).toContain(
      "1 guest in this plan can no longer be seated as written."
    );
    expect(preview.movedCount).toBe(0);
  });
});

describe("a payload the desk cannot read", () => {
  it("gives no preview rather than throwing, for a room", () => {
    expect(
      previewFromStored(
        "apply_hall_layout",
        { layout: { version: 2, width: 30, length: 20 } },
        { layout: null, tables: TABLES, guests: [] }
      )
    ).toBeNull();
  });

  it("gives no preview rather than throwing, for a seating plan", () => {
    expect(
      previewFromStored(
        "apply_seating_plan",
        { assignments: [] },
        { layout: null, tables: TABLES, guests: [] }
      )
    ).toBeNull();
  });

  it("gives no preview for a kind that changes neither the room nor the seating", () => {
    expect(
      previewFromStored(
        "send_invitations",
        { guestIds: [uuid(1)] },
        { layout: null, tables: TABLES, guests: [] }
      )
    ).toBeNull();
  });
});
