import { describe, expect, it } from "vitest";
import {
  createTableSchema,
  updateTableSchema,
  assignSeatInputSchema,
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
