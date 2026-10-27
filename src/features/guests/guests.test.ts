import { describe, it, expect, vi, beforeEach } from "vitest";
import * as serverClient from "@/lib/supabase/server";
import {
  createGuestAction,
  updateGuestAction,
  deleteGuestAction,
  regenerateTokenAction,
  importGuestsAction,
} from "./actions";
import { getEventGuests } from "./queries";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

function mockSupabase(overrides: Record<string, unknown> = {}) {
  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "gst-1", name: "Chief Femi", rsvp_token: "tok-12345" },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "gst-1", name: "Chief Femi Updated" },
                error: null,
              }),
            }),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "gst-1",
                  event_id: "evt-1",
                  name: "Chief Femi",
                  party_size: 2,
                  rsvps: [{ status: "accepted", attending_count: 2 }],
                  seat_assignments: [
                    { table_id: "tbl-1", tables: { name: "Table Gold" } },
                  ],
                },
              ],
              count: 1,
              error: null,
            }),
          }),
        }),
      }),
    }),
    rpc: vi.fn().mockImplementation((proc: string) => {
      if (proc === "regenerate_guest_token") {
        return Promise.resolve({
          data: "new_regenerated_token_22chars",
          error: null,
        });
      }
      if (proc === "import_guests") {
        return Promise.resolve({
          data: { ok: true, imported_count: 2 },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),
    ...overrides,
  };
}

describe("guest actions and queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createGuestAction", () => {
    it("generates server-side token and creates guest record", async () => {
      vi.mocked(serverClient.createClient).mockResolvedValue(
        mockSupabase() as never
      );

      const res = await createGuestAction("evt-1", {
        name: "Chief Adeleke",
        phone: "08031234567",
        email: "adeleke@example.com",
        party_size: 2,
        side: "groom",
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data?.name).toBe("Chief Femi");
      }
    });

    it("rejects guest creation with invalid payload", async () => {
      const res = await createGuestAction("evt-1", {
        name: "", // Invalid empty name
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("Guest name is required");
      }
    });
  });

  describe("updateGuestAction", () => {
    it("updates existing guest record", async () => {
      vi.mocked(serverClient.createClient).mockResolvedValue(
        mockSupabase() as never
      );

      const res = await updateGuestAction("gst-1", "evt-1", {
        name: "Chief Femi Updated",
        party_size: 3,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data?.name).toBe("Chief Femi Updated");
      }
    });
  });

  describe("deleteGuestAction", () => {
    it("deletes guest record", async () => {
      vi.mocked(serverClient.createClient).mockResolvedValue(
        mockSupabase() as never
      );

      const res = await deleteGuestAction("gst-1", "evt-1");
      expect(res.ok).toBe(true);
    });
  });

  describe("regenerateTokenAction", () => {
    it("generates a new token and updates via rpc", async () => {
      vi.mocked(serverClient.createClient).mockResolvedValue(
        mockSupabase() as never
      );

      const res = await regenerateTokenAction("gst-1", "evt-1");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data?.newToken).toBe("new_regenerated_token_22chars");
      }
    });
  });

  describe("importGuestsAction", () => {
    it("validates rows on server and imports batch", async () => {
      vi.mocked(serverClient.createClient).mockResolvedValue(
        mockSupabase() as never
      );

      const res = await importGuestsAction("evt-1", [
        { name: "Guest One", party_size: 2 },
        { name: "Guest Two", party_size: 1 },
      ]);

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data?.count).toBe(2);
      }
    });

    it("rejects batch if any row is invalid", async () => {
      const res = await importGuestsAction("evt-1", [
        { name: "Valid Guest", party_size: 2 },
        { name: "", party_size: 1 }, // Invalid
      ]);

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("Row 2: Guest name is required");
      }
    });
  });

  describe("getEventGuests", () => {
    it("queries guests with pagination and relations", async () => {
      vi.mocked(serverClient.createClient).mockResolvedValue(
        mockSupabase() as never
      );

      const res = await getEventGuests("evt-1", {
        page: 1,
        pageSize: 15,
      });

      expect(res.guests.length).toBe(1);
      expect(res.guests[0].name).toBe("Chief Femi");
      expect(res.guests[0].rsvp?.status).toBe("accepted");
      expect(res.guests[0].seat?.table_name).toBe("Table Gold");
    });
  });
});
