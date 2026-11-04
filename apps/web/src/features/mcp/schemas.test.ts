import { describe, it, expect } from "vitest";
import {
  addGuestInput,
  importGuestsInput,
  MAX_IMPORT_ROWS,
  MAX_PAGE_SIZE,
  MAX_PROPOSAL_GUESTS,
  listGuestsInput,
  proposeSendInvitationsInput,
  updateGuestInput,
} from "./schemas";

const EVENT_ID = "11111111-1111-4111-8111-111111111111";

function rows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    name: `Guest ${index + 1}`,
  }));
}

function guestIds(count: number) {
  return Array.from(
    { length: count },
    (_, index) =>
      `22222222-2222-4222-8222-${String(index + 1).padStart(12, "0")}`
  );
}

describe("importGuestsInput", () => {
  it("accepts a full import of 200 guests", () => {
    const parsed = importGuestsInput.safeParse({
      eventId: EVENT_ID,
      guests: rows(MAX_IMPORT_ROWS),
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.guests).toHaveLength(200);
  });

  it("rejects 201 guests with a message the model can act on", () => {
    const parsed = importGuestsInput.safeParse({
      eventId: EVENT_ID,
      guests: rows(MAX_IMPORT_ROWS + 1),
    });

    expect(parsed.success).toBe(false);
    expect(parsed.success ? "" : parsed.error.issues[0].message).toBe(
      "A single import accepts at most 200 guests"
    );
  });

  it("rejects an empty import", () => {
    expect(
      importGuestsInput.safeParse({ eventId: EVENT_ID, guests: [] }).success
    ).toBe(false);
  });

  it("defaults a row's party size to one", () => {
    const parsed = importGuestsInput.parse({
      eventId: EVENT_ID,
      guests: [{ name: "Ada" }],
    });

    expect(parsed.guests[0].partySize).toBe(1);
  });
});

describe("proposeSendInvitationsInput", () => {
  it("accepts a proposal naming the full 25 guests", () => {
    const parsed = proposeSendInvitationsInput.safeParse({
      eventId: EVENT_ID,
      guestIds: guestIds(MAX_PROPOSAL_GUESTS),
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.guestIds).toHaveLength(25);
  });

  it("rejects 26 named guests with a message the model can act on", () => {
    const parsed = proposeSendInvitationsInput.safeParse({
      eventId: EVENT_ID,
      guestIds: guestIds(MAX_PROPOSAL_GUESTS + 1),
    });

    expect(parsed.success).toBe(false);
    expect(parsed.success ? "" : parsed.error.issues[0].message).toBe(
      "A single proposal may name at most 25 guests"
    );
  });

  it("accepts a proposal that names no guests, meaning everyone eligible", () => {
    const parsed = proposeSendInvitationsInput.safeParse({ eventId: EVENT_ID });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.guestIds).toBeUndefined();
  });
});

describe("party size", () => {
  it("accepts a party of 20", () => {
    expect(
      addGuestInput.safeParse({
        eventId: EVENT_ID,
        name: "The Bello family",
        partySize: 20,
      }).success
    ).toBe(true);
    expect(
      updateGuestInput.safeParse({
        eventId: EVENT_ID,
        guestId: EVENT_ID,
        partySize: 20,
      }).success
    ).toBe(true);
  });

  it("rejects a party of 21", () => {
    expect(
      addGuestInput.safeParse({
        eventId: EVENT_ID,
        name: "The Bello family",
        partySize: 21,
      }).success
    ).toBe(false);
    expect(
      updateGuestInput.safeParse({
        eventId: EVENT_ID,
        guestId: EVENT_ID,
        partySize: 21,
      }).success
    ).toBe(false);
  });
});

describe("paging", () => {
  it("accepts a page size of 50 and rejects 51", () => {
    expect(
      listGuestsInput.safeParse({ eventId: EVENT_ID, pageSize: MAX_PAGE_SIZE })
        .success
    ).toBe(true);
    expect(
      listGuestsInput.safeParse({ eventId: EVENT_ID, pageSize: 51 }).success
    ).toBe(false);
  });

  it("defaults to the first page of 25", () => {
    const parsed = listGuestsInput.parse({ eventId: EVENT_ID });
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(25);
  });
});

describe("event ids", () => {
  it("rejects anything that is not a UUID", () => {
    expect(listGuestsInput.safeParse({ eventId: "not-an-id" }).success).toBe(
      false
    );
  });
});
