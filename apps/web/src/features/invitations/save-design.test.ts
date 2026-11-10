import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInvitationDesign } from "./design";
const { client, ended, revalidate, result } = vi.hoisted(() => ({
  client: vi.fn(),
  ended: vi.fn(),
  revalidate: vi.fn(),
  result: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: client }));
vi.mock("@/features/events/expiry", () => ({ eventEndedError: ended }));
vi.mock("next/cache", () => ({ revalidatePath: revalidate }));
import { saveInvitationDesignAction } from "./actions";
const design = createInvitationDesign({ couple: "Ọlá & Adéṣọlá" });
const query = {
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: result,
};
beforeEach(() => {
  vi.clearAllMocks();
  ended.mockResolvedValue(null);
  result.mockResolvedValue({
    data: { updated_at: "2026-11-10T12:00:00Z" },
    error: null,
  });
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  client.mockResolvedValue({ from: () => query });
});
describe("save invitation with optimistic concurrency", () => {
  it("saves only the revision the editor loaded and returns the next revision", async () => {
    const out = await saveInvitationDesignAction(
      "event",
      design,
      "2026-11-10T11:00:00Z"
    );
    expect(query.eq).toHaveBeenCalledWith("updated_at", "2026-11-10T11:00:00Z");
    expect(out).toMatchObject({ ok: true, revision: "2026-11-10T12:00:00Z" });
    expect(revalidate).toHaveBeenCalled();
  });
  it("rejects a stale revision instead of silently reporting success", async () => {
    result.mockResolvedValue({ data: null, error: null });
    const out = await saveInvitationDesignAction(
      "event",
      design,
      "2026-11-10T11:00:00Z"
    );
    expect(out).toMatchObject({
      ok: false,
      error: expect.stringContaining("another tab"),
    });
    expect(revalidate).not.toHaveBeenCalled();
  });
  it("does not report a blocked or deleted row as saved", async () => {
    result.mockResolvedValue({ data: null, error: null });
    expect(await saveInvitationDesignAction("event", design)).toMatchObject({
      ok: false,
    });
  });
  it("rejects invalid revision input before accessing the database", async () => {
    expect(
      await saveInvitationDesignAction("event", design, "not a timestamp")
    ).toMatchObject({ ok: false });
    expect(client).not.toHaveBeenCalled();
  });
  it("does not update an ended event", async () => {
    ended.mockResolvedValue("This event has ended");
    expect(await saveInvitationDesignAction("event", design)).toEqual({
      ok: false,
      error: "This event has ended",
    });
    expect(query.update).not.toHaveBeenCalled();
  });
});
