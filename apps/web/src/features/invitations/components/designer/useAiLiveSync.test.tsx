import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { designFromEvent } from "../../design";
import type { AiLiveSyncDoc } from "./useAiLiveSync";

const latest = vi.hoisted(() => ({ fn: vi.fn() }));
const realtime = vi.hoisted(() => ({ onChange: null as null | (() => void) }));

vi.mock("../../live-sync-actions", () => ({
  getLatestInvitationStateAction: latest.fn,
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    const channel = {
      on: (_e: string, _f: unknown, cb: () => void) => {
        realtime.onChange = cb;
        return channel;
      },
      subscribe: (cb: (status: string) => void) => {
        cb("SUBSCRIBED");
        return channel;
      },
    };
    return { channel: () => channel, removeChannel: vi.fn() };
  },
}));

import { useAiLiveSync } from "./useAiLiveSync";

const MINE = designFromEvent({ couple: "Ada & Obi", date: "2026-12-12" });
const NEWER = { ...MINE, theme: "emerald_regal" as const };

function fakeDoc(over: Partial<AiLiveSyncDoc> = {}): AiLiveSyncDoc {
  return {
    design: MINE,
    isDirty: true,
    getRevision: () => "rev-1",
    isSaving: () => false,
    applyRemoteDesign: vi.fn(),
    noteRemoteDesign: vi.fn(),
    adoptRevision: vi.fn(),
    flushSave: vi.fn(async () => true),
    ...over,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  latest.fn.mockReset();
  latest.fn.mockResolvedValue({
    ok: true,
    revision: "rev-2",
    design: NEWER,
    aiSummary: null,
  });
});
afterEach(() => vi.useRealTimers());

describe("useAiLiveSync", () => {
  it("waits for the host's own save before deciding anything changed", async () => {
    let saving = true;
    let revision = "rev-1";
    const doc = fakeDoc({
      isSaving: () => saving,
      getRevision: () => revision,
    });
    const { result } = renderHook(() =>
      useAiLiveSync("11111111-1111-4111-8111-111111111111", () => doc, vi.fn())
    );

    // The host's save echoes back as a change while it is still in flight.
    await act(async () => {
      realtime.onChange?.();
    });
    expect(latest.fn).not.toHaveBeenCalled();
    expect(result.current.conflict).toBeNull();

    // The save lands and carries the new revision: the echo is recognised as the host's own.
    saving = false;
    revision = "rev-2";
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });
    expect(latest.fn).toHaveBeenCalledTimes(1);
    expect(result.current.conflict).toBeNull();
    expect(doc.applyRemoteDesign).not.toHaveBeenCalled();
  });

  it("asks before replacing unsaved edits with a real remote change", async () => {
    const doc = fakeDoc();
    const { result } = renderHook(() =>
      useAiLiveSync("11111111-1111-4111-8111-111111111111", () => doc, vi.fn())
    );
    await act(async () => {
      realtime.onChange?.();
    });
    expect(result.current.conflict).not.toBeNull();
    expect(doc.applyRemoteDesign).not.toHaveBeenCalled();
  });

  it("applies a remote change on a clean canvas as one labelled step", async () => {
    const notice = vi.fn();
    const doc = fakeDoc({ isDirty: false });
    latest.fn.mockResolvedValue({
      ok: true,
      revision: "rev-2",
      design: NEWER,
      aiSummary: "applied the Emerald Regal theme",
    });
    renderHook(() =>
      useAiLiveSync("11111111-1111-4111-8111-111111111111", () => doc, notice)
    );
    await act(async () => {
      realtime.onChange?.();
    });
    expect(doc.applyRemoteDesign).toHaveBeenCalledWith(
      NEWER,
      "rev-2",
      "AI: applied the Emerald Regal theme"
    );
    expect(notice).toHaveBeenCalledWith(
      "Your AI applied the Emerald Regal theme"
    );
  });
});
