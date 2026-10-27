import { describe, expect, it, vi, beforeEach } from "vitest";
import { getInvitationByToken } from "./queries";
import * as serverClient from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: () => "127.0.0.1",
  }),
}));

type SupabaseServerClient = Awaited<
  ReturnType<typeof serverClient.createClient>
>;

function mockSupabase(partial: object): SupabaseServerClient {
  return Object.assign({} as SupabaseServerClient, partial);
}

describe("RSVP Domain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invalid_link for short or invalid tokens", async () => {
    const res = await getInvitationByToken("short");
    expect(res.state).toBe("invalid_link");
    expect(res.data).toBeNull();
  });

  it("returns active state for valid unreplied invitation", async () => {
    const mockData = {
      guest: {
        id: "g-1",
        first_name: "Folake",
        display_name: "Folake Balogun",
        party_size: 2,
        plus_ones_allowed: true,
      },
      rsvp: null,
      event: {
        id: "e-1",
        title: "The Royal Wedding",
        couple: "Folake & Tunde",
        date: "2026-12-12T14:00:00Z",
        venue: "Grand Ballroom",
        area: "Lagos",
        dress_code: "Wine Velvet",
        rsvp_by: "2026-11-30T00:00:00Z",
        status: "active",
      },
      table_name: null,
    };

    const mockRpc = vi.fn().mockImplementation((fnName: string) => {
      if (fnName === "hit_rate_limit") {
        return Promise.resolve({
          data: [
            {
              allowed: true,
              remaining: 10,
              reset_at: new Date(Date.now() + 60000).toISOString(),
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: mockData, error: null });
    });

    vi.mocked(serverClient.createClient).mockResolvedValue(
      mockSupabase({ rpc: mockRpc })
    );

    const res = await getInvitationByToken("valid_token_sample_12345");
    expect(res.state).toBe("active");
    expect(res.data?.guest.display_name).toBe("Folake Balogun");
  });

  it("returns already_replied state when RSVP has been answered", async () => {
    const mockData = {
      guest: {
        id: "g-1",
        first_name: "Folake",
        display_name: "Folake Balogun",
        party_size: 2,
        plus_ones_allowed: true,
      },
      rsvp: {
        status: "accepted",
        attending_count: 2,
        plus_one_name: "Tunde",
        dietary: "None",
        note: "Excited!",
        responded_at: "2026-10-25T10:00:00Z",
      },
      event: {
        id: "e-1",
        title: "The Royal Wedding",
        couple: "Folake & Tunde",
        date: "2026-12-12T14:00:00Z",
        venue: "Grand Ballroom",
        area: null,
        dress_code: null,
        rsvp_by: null,
        status: "active",
      },
      table_name: "Table 1",
    };

    const mockRpc = vi.fn().mockImplementation((fnName: string) => {
      if (fnName === "hit_rate_limit") {
        return Promise.resolve({
          data: [
            {
              allowed: true,
              remaining: 10,
              reset_at: new Date(Date.now() + 60000).toISOString(),
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: mockData, error: null });
    });

    vi.mocked(serverClient.createClient).mockResolvedValue(
      mockSupabase({ rpc: mockRpc })
    );

    const res = await getInvitationByToken("valid_token_sample_12345");
    expect(res.state).toBe("already_replied");
  });

  it("returns revise state when isReviseRequested is true for replied guest", async () => {
    const mockData = {
      guest: {
        id: "g-1",
        first_name: "Folake",
        display_name: "Folake Balogun",
        party_size: 2,
        plus_ones_allowed: true,
      },
      rsvp: {
        status: "accepted",
        attending_count: 2,
        plus_one_name: null,
        dietary: null,
        note: null,
        responded_at: "2026-10-25T10:00:00Z",
      },
      event: {
        id: "e-1",
        title: "The Royal Wedding",
        couple: "Folake & Tunde",
        date: "2026-12-12T14:00:00Z",
        venue: "Grand Ballroom",
        area: null,
        dress_code: null,
        rsvp_by: null,
        status: "active",
      },
      table_name: "Table 1",
    };

    const mockRpc = vi.fn().mockImplementation((fnName: string) => {
      if (fnName === "hit_rate_limit") {
        return Promise.resolve({
          data: [
            {
              allowed: true,
              remaining: 10,
              reset_at: new Date(Date.now() + 60000).toISOString(),
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: mockData, error: null });
    });

    vi.mocked(serverClient.createClient).mockResolvedValue(
      mockSupabase({ rpc: mockRpc })
    );

    const res = await getInvitationByToken("valid_token_sample_12345", true);
    expect(res.state).toBe("revise");
  });

  it("returns closed state when event status is not active", async () => {
    const mockData = {
      guest: {
        id: "g-1",
        first_name: "A",
        display_name: "A",
        party_size: 1,
        plus_ones_allowed: false,
      },
      rsvp: null,
      event: {
        id: "e-1",
        title: "Archived",
        couple: "A & B",
        date: "2026-12-12",
        venue: "V",
        area: null,
        dress_code: null,
        rsvp_by: null,
        status: "archived",
      },
      table_name: null,
    };

    const mockRpc = vi.fn().mockImplementation((fnName: string) => {
      if (fnName === "hit_rate_limit") {
        return Promise.resolve({
          data: [
            {
              allowed: true,
              remaining: 10,
              reset_at: new Date(Date.now() + 60000).toISOString(),
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: mockData, error: null });
    });

    vi.mocked(serverClient.createClient).mockResolvedValue(
      mockSupabase({ rpc: mockRpc })
    );

    const res = await getInvitationByToken("valid_token_sample_12345");
    expect(res.state).toBe("closed");
  });
});
