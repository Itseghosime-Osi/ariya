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
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              name: "Chief Femi",
              phone: "+2348011111111",
              email: "femi@example.com",
            },
          ],
          error: null,
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
      if (proc === "search_guests") {
        return Promise.resolve({
          data: [
            {
              id: "gst-1",
              event_id: "evt-1",
              name: "Chief Femi",
              phone: "+2348011111111",
              email: "femi@example.com",
              side: "groom",
              group_name: "VIP",
              party_size: 2,
              plus_ones_allowed: false,
              is_vip: false,
              rsvp_token: "tok-12345",
              notes: null,
              invited_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              rsvp_id: "rsp-1",
              rsvp_status: "accepted",
              rsvp_attending_count: 2,
              rsvp_plus_one_name: null,
              rsvp_dietary: null,
              rsvp_note: null,
              rsvp_responded_at: null,
              seat_table_id: "tbl-1",
              seat_table_name: "Table Gold",
              total_count: 1,
            },
          ],
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
    it("creates a guest with normalized phone and default values", async () => {
      vi.mocked(serverClient.createClient).mockResolvedValue(
        mockSupabase() as never
      );

      const res = await createGuestAction("evt-1", {
        name: "Chief Femi",
        phone: "0803 123 4567",
        party_size: 2,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data?.name).toBe("Chief Femi");
      }
    });

    it("rejects invalid guest payload with missing name", async () => {
      const res = await createGuestAction("evt-1", {
        name: "",
        party_size: 1,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("Guest name is required");
      }
    });
  });

  describe("updateGuestAction", () => {
    it("updates guest details", async () => {
      vi.mocked(serverClient.createClient).mockResolvedValue(
        mockSupabase() as never
      );

      const res = await updateGuestAction("gst-1", "evt-1", {
        name: "Chief Femi Updated",
        party_size: 3,
      });

      expect(res.ok).toBe(true);
    });
  });

  describe("deleteGuestAction", () => {
    it("deletes a guest from the event", async () => {
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

  describe("getEventGuests with search_guests RPC", () => {
    it("queries guests with pagination and relations via rpc", async () => {
      const client = mockSupabase();
      vi.mocked(serverClient.createClient).mockResolvedValue(client as never);

      const res = await getEventGuests("evt-1", {
        page: 1,
        pageSize: 15,
      });

      expect(res.guests.length).toBe(1);
      expect(res.guests[0].name).toBe("Chief Femi");
      expect(res.guests[0].rsvp?.status).toBe("accepted");
      expect(res.guests[0].seat?.table_name).toBe("Table Gold");
      expect(client.rpc).toHaveBeenCalledWith(
        "search_guests",
        expect.objectContaining({
          p_event_id: "evt-1",
          p_limit: 15,
          p_offset: 0,
        })
      );
    });

    it.each([["a,id.neq.0"], ["%"], ["_"], ["("], ["x)"]])(
      "safely passes malicious search input %s to parameterized search_guests RPC",
      async (maliciousSearch) => {
        const client = mockSupabase();
        vi.mocked(serverClient.createClient).mockResolvedValue(client as never);

        const res = await getEventGuests("evt-1", {
          search: maliciousSearch,
          page: 1,
          pageSize: 25,
        });

        expect(res.guests.length).toBe(1);
        expect(client.rpc).toHaveBeenCalledWith(
          "search_guests",
          expect.objectContaining({
            p_event_id: "evt-1",
            p_search: maliciousSearch,
          })
        );
      }
    );
  });
});
