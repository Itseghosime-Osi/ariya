import { act, renderHook } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useDesignerDoc } from "./useDesignerDoc";
import { createInvitationDesign } from "../../design";
const { save } = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("../../actions", () => ({ saveInvitationDesignAction: save }));
const initial = () =>
  createInvitationDesign({
    title: "A celebration",
    couple: "Ada & Kunle",
    date: "2026-12-12",
    venue: "The Hall",
    area: "Lagos",
    dressCode: null,
    rsvpBy: null,
    theme: "royal_gold",
  });
function deferred() {
  let resolve!: (v: { ok: boolean; error?: string }) => void;
  const promise = new Promise<{ ok: boolean; error?: string }>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
describe("invitation document save queue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    localStorage.clear();
    save.mockReset();
    save.mockResolvedValue({ ok: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it("opens the existing template without creating a save or a blank document", () => {
    const d = initial();
    const { result } = renderHook(() => useDesignerDoc("event", d));
    expect(result.current.design).toEqual(d);
    expect(save).not.toHaveBeenCalled();
  });
  it("debounces edits and preserves useful undo/redo states", async () => {
    const d = initial();
    const { result } = renderHook(() => useDesignerDoc("event", d));
    act(() => result.current.commit((x) => ({ ...x, chrome: false })));
    await act(() => vi.advanceTimersByTimeAsync(701));
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.saveState).toBe("saved");
    act(() => result.current.undo());
    expect(result.current.design.chrome).toBe(d.chrome);
    act(() => result.current.redo());
    expect(result.current.design.chrome).toBe(false);
  });
  it("serializes writes so a slow old save cannot overwrite a newer edit", async () => {
    const first = deferred(),
      second = deferred();
    save.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useDesignerDoc("event", initial()));
    act(() => result.current.commit((d) => ({ ...d, chrome: false })));
    let drain!: Promise<boolean>;
    act(() => {
      drain = result.current.flushSave();
    });
    act(() =>
      result.current.commit((d) => ({
        ...d,
        background: { ...d.background, kind: "velvet" },
      }))
    );
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => {
      first.resolve({ ok: true });
      await Promise.resolve();
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][1].background.kind).toBe("velvet");
    await act(async () => {
      second.resolve({ ok: true });
      await drain;
    });
    expect(result.current.isDirty).toBe(false);
  });
  it("writes an undo back to the original template after an in-flight save", async () => {
    const old = deferred();
    save.mockReturnValueOnce(old.promise);
    const d = initial();
    const { result } = renderHook(() => useDesignerDoc("event", d));
    act(() => result.current.commit((x) => ({ ...x, chrome: false })));
    let drain!: Promise<boolean>;
    act(() => {
      drain = result.current.flushSave();
    });
    act(() => result.current.undo());
    await act(async () => {
      old.resolve({ ok: true });
      await drain;
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][1]).toEqual(d);
    expect(result.current.isDirty).toBe(false);
  });
  it("keeps failed edits dirty and retries the current document", async () => {
    save.mockResolvedValueOnce({ ok: false, error: "Connection interrupted" });
    const { result } = renderHook(() => useDesignerDoc("event", initial()));
    act(() => result.current.commit((d) => ({ ...d, chrome: false })));
    await act(async () => {
      expect(await result.current.flushSave()).toBe(false);
    });
    expect(result.current.isDirty).toBe(true);
    expect(result.current.saveState).toBe("error");
    await act(async () => {
      expect(await result.current.flushSave()).toBe(true);
    });
    expect(result.current.saveState).toBe("saved");
    expect(result.current.isDirty).toBe(false);
  });
  it("flushes a pending edit when the editor unmounts before its debounce", async () => {
    const { result, unmount } = renderHook(() =>
      useDesignerDoc("event", initial())
    );
    act(() => result.current.commit((d) => ({ ...d, chrome: false })));
    unmount();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][1].chrome).toBe(false);
  });
  it("discards the redo branch after a new edit", () => {
    const { result } = renderHook(() => useDesignerDoc("event", initial()));
    act(() => result.current.commit((d) => ({ ...d, chrome: false })));
    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);
    act(() =>
      result.current.commit((d) => ({
        ...d,
        background: { ...d.background, kind: "velvet" },
      }))
    );
    expect(result.current.canRedo).toBe(false);
    expect(result.current.future).toHaveLength(0);
  });
  it("bounds history at 50 operations without losing the current document", () => {
    const { result } = renderHook(() => useDesignerDoc("event", initial()));
    act(() => {
      for (let i = 0; i < 80; i++)
        result.current.commit((d) => ({
          ...d,
          layers: d.layers.map((l, index) =>
            index === 0 ? { ...l, text: String(i) } : l
          ),
        }));
    });
    expect(result.current.past).toHaveLength(50);
    expect(result.current.design.layers[0].text).toBe("79");
    act(() => {
      for (let i = 0; i < 50; i++) result.current.undo();
    });
    expect(result.current.design.layers[0].text).toBe("29");
    expect(result.current.canUndo).toBe(false);
  });
  it("recovers a failed edit on reload without replacing a newer server revision", async () => {
    save.mockResolvedValue({ ok: false, error: "offline" });
    const original = initial();
    const first = renderHook(() =>
      useDesignerDoc("recovery", original, "2026-11-10T10:00:00Z")
    );
    act(() => first.result.current.commit((d) => ({ ...d, chrome: false })));
    await act(() => vi.advanceTimersByTimeAsync(701));
    first.unmount();
    const reload = renderHook(() =>
      useDesignerDoc("recovery", original, "2026-11-10T10:00:00Z")
    );
    expect(reload.result.current.recovered).toBe(true);
    expect(reload.result.current.design.chrome).toBe(false);
    reload.unmount();
    const newer = renderHook(() =>
      useDesignerDoc("recovery", original, "2026-11-10T11:00:00Z")
    );
    expect(newer.result.current.recovered).toBe(false);
    expect(newer.result.current.design).toEqual(original);
  });
  it("passes the current revision to the next serialized write", async () => {
    save.mockResolvedValue({ ok: true, revision: "2026-11-10T11:00:00Z" });
    const { result } = renderHook(() =>
      useDesignerDoc("versioned", initial(), "2026-11-10T10:00:00Z")
    );
    act(() => result.current.commit((d) => ({ ...d, chrome: false })));
    await act(() => vi.advanceTimersByTimeAsync(701));
    act(() => result.current.commit((d) => ({ ...d, chrome: true })));
    await act(() => vi.advanceTimersByTimeAsync(701));
    expect(save.mock.calls[0][2]).toBe("2026-11-10T10:00:00Z");
    expect(save.mock.calls[1][2]).toBe("2026-11-10T11:00:00Z");
  });
  it("retries a dropped connection by itself and then saves", async () => {
    save
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useDesignerDoc("net", initial()));
    act(() => result.current.commit((d) => ({ ...d, chrome: false })));
    await act(() => vi.advanceTimersByTimeAsync(701));
    expect(result.current.saveState).toBe("error");
    expect(save).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(2001));
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.saveState).toBe("saved");
    expect(result.current.isDirty).toBe(false);
  });
  it("saves queued edits as soon as the browser is back online", async () => {
    save
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useDesignerDoc("online", initial()));
    act(() => result.current.commit((d) => ({ ...d, chrome: false })));
    await act(() => vi.advanceTimersByTimeAsync(701));
    expect(result.current.saveState).toBe("error");
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.saveState).toBe("saved");
  });
  it("does not retry when the server refuses the save", async () => {
    save.mockResolvedValue({
      ok: false,
      error: "This event changed in another tab or window.",
    });
    const { result } = renderHook(() => useDesignerDoc("refused", initial()));
    act(() => result.current.commit((d) => ({ ...d, chrome: false })));
    await act(() => vi.advanceTimersByTimeAsync(701));
    await act(() => vi.advanceTimersByTimeAsync(60000));
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.saveState).toBe("error");
    expect(result.current.saveError).toMatch(/another tab/);
  });
  it("keeps an unsaved draft after the tab is closed and reopened", async () => {
    save.mockRejectedValue(new TypeError("Failed to fetch"));
    const original = initial();
    const first = renderHook(() =>
      useDesignerDoc("closed-tab", original, "2026-11-10T10:00:00Z")
    );
    act(() => first.result.current.commit((d) => ({ ...d, chrome: false })));
    await act(() => vi.advanceTimersByTimeAsync(701));
    first.unmount();
    sessionStorage.clear(); // a closed tab takes its session storage with it
    const reopened = renderHook(() =>
      useDesignerDoc("closed-tab", original, "2026-11-10T10:00:00Z")
    );
    expect(reopened.result.current.recovered).toBe(true);
    expect(reopened.result.current.design.chrome).toBe(false);
  });
});
