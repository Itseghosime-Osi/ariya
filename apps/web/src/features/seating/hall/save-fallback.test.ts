import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../actions", () => ({ saveHallLayoutAction: vi.fn() }));

import { isStaleBuildError, saveViaRoute } from "./useHallLayout";
import { defaultLayout } from "./model";

afterEach(() => vi.unstubAllGlobals());

function respond(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status }))
  );
}

describe("a tab left open across a release", () => {
  it("recognises the error a missing server action throws", () => {
    const err = new Error(
      'Server Action "7f2a" was not found on the server. Read more: https://nextjs.org/docs/messages/failed-to-find-server-action'
    );
    expect(isStaleBuildError(err)).toBe(true);
    expect(
      isStaleBuildError({ name: "UnrecognizedActionError", message: "x" })
    ).toBe(true);
    expect(isStaleBuildError(new Error("network down"))).toBe(false);
    expect(isStaleBuildError(null)).toBe(false);
  });

  it("saves through the plain address and reads its answers", async () => {
    const layout = defaultLayout();
    respond(200, { ok: true, rev: 7 });
    expect(await saveViaRoute("e1", layout, 6)).toEqual({
      ok: true,
      data: { rev: 7 },
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/events/e1/hall-layout",
      expect.objectContaining({ method: "PUT" })
    );

    respond(409, { conflict: true, rev: 9, layout: { width: 20 } });
    const conflict = await saveViaRoute("e1", layout, 6);
    expect(conflict.ok).toBe(false);
    expect(conflict.data).toEqual({
      conflict: true,
      rev: 9,
      layout: { width: 20 },
    });

    respond(200, { fallback: true });
    expect((await saveViaRoute("e1", layout)).data).toEqual({
      fallback: true,
    });

    respond(500, { error: "Could not save" });
    await expect(saveViaRoute("e1", layout)).rejects.toThrow();
  });
});
