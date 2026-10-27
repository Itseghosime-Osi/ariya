import { describe, expect, it, vi, beforeEach } from "vitest";
import { createEventSchema, updateEventSchema } from "./schemas";
import { daysUntil } from "@/lib/format";
import { createEventAction, updateEventAction } from "./actions";
import { getUserEvents, getPublicEventBySlug } from "./queries";
import * as serverClient from "@/lib/supabase/server";
import * as adminClient from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

type SupabaseServerClient = Awaited<
  ReturnType<typeof serverClient.createClient>
>;

function mockSupabase(partial: object): SupabaseServerClient {
  return Object.assign({} as SupabaseServerClient, partial);
}

describe("Events Domain", () => {
  describe("createEventSchema", () => {
    it("accepts valid celebration payload", () => {
      const valid = createEventSchema.safeParse({
        title: "Chidinma & Tunde's Nuptials",
        couple: "Chidinma & Tunde",
        date: "2026-12-12T14:00",
        venue: "The Grand Pavilion",
        area: "Victoria Island, Lagos",
        dressCode: "Aṣọ-Ẹbí: Burgundy velvet",
        targetParties: 200,
        intakeMethod: "csv",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects celebration with short couple names", () => {
      const invalid = createEventSchema.safeParse({
        title: "Celebration",
        couple: "A",
        date: "2026-12-12T14:00",
        venue: "The Grand Pavilion",
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects celebration with missing venue", () => {
      const invalid = createEventSchema.safeParse({
        title: "Celebration",
        couple: "Chidinma & Tunde",
        date: "2026-12-12T14:00",
        venue: "",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("updateEventSchema", () => {
    it("accepts partial updates", () => {
      const valid = updateEventSchema.safeParse({
        status: "archived",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("daysUntil calculation", () => {
    it("calculates positive days for future date", () => {
      const future = new Date(
        Date.now() + 10 * 24 * 60 * 60 * 1000
      ).toISOString();
      const days = daysUntil(future);
      expect(days).toBeGreaterThanOrEqual(9);
      expect(days).toBeLessThanOrEqual(11);
    });

    it("returns 0 for past date", () => {
      const past = "2020-01-01T00:00:00Z";
      expect(daysUntil(past)).toBe(0);
    });
  });

  describe("createEventAction", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("creates an event via create_event RPC and returns id and slug", async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: { id: "evt-123", slug: "chidinma-tunde-abc123" },
        error: null,
      });

      vi.mocked(serverClient.createClient).mockResolvedValue(
        mockSupabase({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: "user-123" } },
            }),
          },
          rpc: mockRpc,
        })
      );

      const res = await createEventAction({
        title: "Chidinma & Tunde's Nuptials",
        couple: "Chidinma & Tunde",
        date: "2026-12-12T14:00",
        venue: "The Grand Pavilion",
        area: "Victoria Island, Lagos",
        dressCode: "Burgundy velvet",
        targetParties: 200,
        intakeMethod: "csv",
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data?.eventId).toBe("evt-123");
        expect(res.data?.slug).toBe("chidinma-tunde-abc123");
      }
      expect(mockRpc).toHaveBeenCalledWith(
        "create_event",
        expect.objectContaining({
          p_title: "Chidinma & Tunde's Nuptials",
          p_couple: "Chidinma & Tunde",
        })
      );
    });

    it("retries on slug unique collision and succeeds", async () => {
      const mockRpc = vi
        .fn()
        .mockResolvedValueOnce({
          data: null,
          error: {
            code: "23505",
            message: "duplicate key value violates unique constraint",
          },
        })
        .mockResolvedValueOnce({
          data: { id: "evt-456", slug: "chidinma-tunde-retry12" },
          error: null,
        });

      vi.mocked(serverClient.createClient).mockResolvedValue(
        mockSupabase({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: "user-123" } },
            }),
          },
          rpc: mockRpc,
        })
      );

      const res = await createEventAction({
        title: "Chidinma & Tunde's Nuptials",
        couple: "Chidinma & Tunde",
        date: "2026-12-12T14:00",
        venue: "The Grand Pavilion",
        area: "Victoria Island, Lagos",
        dressCode: "Burgundy velvet",
        targetParties: 200,
        intakeMethod: "csv",
      });

      expect(res.ok).toBe(true);
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });
  });

  describe("updateEventAction", () => {
    it("returns error if update modifies 0 rows", async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      vi.mocked(serverClient.createClient).mockResolvedValue(
        mockSupabase({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: "user-123" } },
            }),
          },
          from: vi.fn().mockReturnValue({
            update: mockUpdate,
          }),
        })
      );

      const res = await updateEventAction("evt-non-existent", {
        title: "Updated Title",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe(
          "Celebration not found or you do not have permission to modify it."
        );
      }
    });
  });

  describe("getUserEvents", () => {
    it("returns empty array when user is signed out", async () => {
      vi.mocked(serverClient.createClient).mockResolvedValue(
        mockSupabase({
          auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
          },
        })
      );

      const events = await getUserEvents();
      expect(events).toEqual([]);
    });

    it("returns events with metrics from get_user_events_with_metrics RPC", async () => {
      const mockEvents = [
        {
          event: { id: "evt-1", title: "Test Event", couple: "A & B" },
          role: "owner",
          metrics: { totalParties: 10, totalAttendees: 20 },
        },
      ];

      vi.mocked(serverClient.createClient).mockResolvedValue(
        mockSupabase({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: "user-123" } },
            }),
          },
          rpc: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
        })
      );

      const events = await getUserEvents();
      expect(events).toEqual(mockEvents);
    });
  });

  describe("getPublicEventBySlug", () => {
    it("returns public celebration data when event is active", async () => {
      const mockEvent = {
        id: "evt-active",
        slug: "royal-wedding",
        title: "The Royal Wedding",
        couple: "Chidinma & Babatunde",
        date: "2026-11-20T14:00:00Z",
        venue: "Grand Ballroom",
        area: "Lagos",
        dress_code: "Wine Velvet",
        rsvp_by: "2026-11-01T00:00:00Z",
        status: "active",
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: mockEvent, error: null }),
            }),
          }),
        }),
      });

      vi.mocked(adminClient.createAdminClient).mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof adminClient.createAdminClient>);

      const res = await getPublicEventBySlug("royal-wedding");
      expect(res).not.toBeNull();
      expect(res?.title).toBe("The Royal Wedding");
      expect(res?.slug).toBe("royal-wedding");
    });

    it("returns null when event not found or inactive", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      vi.mocked(adminClient.createAdminClient).mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof adminClient.createAdminClient>);

      const res = await getPublicEventBySlug("non-existent");
      expect(res).toBeNull();
    });
  });
});
