import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getOverrideClient, withSupabaseClient } from "./request-context";
import { createClient } from "./server";

const { createServerClientMock, cookiesMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  cookiesMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));

type FakeClient = SupabaseClient<Database>;

function fakeClient(mark: string): FakeClient {
  return { mark } as unknown as FakeClient;
}

function markOf(client: FakeClient): string {
  return (client as unknown as { mark: string }).mark;
}

describe("createClient", () => {
  beforeEach(() => {
    createServerClientMock.mockReset();
    cookiesMock.mockReset();
    cookiesMock.mockResolvedValue({ getAll: () => [], set: vi.fn() });
  });

  it("falls back to the cookie client when no request installed an override", async () => {
    const cookieClient = fakeClient("cookie");
    createServerClientMock.mockReturnValue(cookieClient);

    expect(getOverrideClient()).toBeUndefined();
    await expect(createClient()).resolves.toBe(cookieClient);
    expect(createServerClientMock).toHaveBeenCalledTimes(1);
  });

  it("gives two overlapping requests their own client", async () => {
    const cookieClient = fakeClient("cookie");
    createServerClientMock.mockReturnValue(cookieClient);

    const seen = { a: [] as string[], b: [] as string[] };

    // A parks on the gate while B runs start to finish, so B's awaits land squarely inside A's.
    let openGate!: () => void;
    const gate = new Promise<void>((resolve) => {
      openGate = resolve;
    });

    const runA = withSupabaseClient(fakeClient("a"), async () => {
      seen.a.push(markOf(await createClient()));
      await gate;
      seen.a.push(markOf(await createClient()));
    });

    const runB = withSupabaseClient(fakeClient("b"), async () => {
      seen.b.push(markOf(await createClient()));
      await Promise.resolve();
      seen.b.push(markOf(await createClient()));
      openGate();
    });

    await Promise.all([runA, runB]);

    expect(seen.a).toEqual(["a", "a"]);
    expect(seen.b).toEqual(["b", "b"]);
    // Neither request ever fell through to the cookie path.
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("hands the store back to the cookie client when the request finishes", async () => {
    await withSupabaseClient(fakeClient("a"), async () => {
      await createClient();
    });

    expect(getOverrideClient()).toBeUndefined();
  });
});
