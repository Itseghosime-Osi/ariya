"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCheckInSnapshotAction,
  performCheckInAction,
  searchCheckInGuestsAction,
  verifyCheckInAction,
} from "./actions";
import {
  admitOffline,
  outcomeOf,
  searchOffline,
  verifyOffline,
  withAdmitted,
  type CheckInSnapshot,
  type QueuedAdmission,
  type SyncOutcome,
} from "./offline";
import {
  loadQueue,
  loadSnapshot,
  saveQueue,
  saveSnapshot,
  wipeExpired,
} from "./offline-store";
import type { CheckInMatch, CheckInResult } from "./types";

/** How often the phone's copy of the guest list is refreshed while there is a signal. */
const REFRESH_MS = 90_000;

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const noList: CheckInResult = {
  status: "unknown_code",
  message:
    "No signal, and this phone has no copy of the guest list yet. Open Check-in once with a signal to save it.",
};

/** A sign-in that ran out is not a refusal: the admission waits until someone signs in again. */
function needsSignIn(error?: string) {
  return /auth|sign in/i.test(error ?? "");
}

export interface OfflineDesk {
  /** False when the last request failed for want of a network, or the browser says so. */
  online: boolean;
  snapshot: CheckInSnapshot | null;
  queue: QueuedAdmission[];
  syncing: boolean;
  /** Admissions the server did not take as they were, for the door staff to know about. */
  outcomes: SyncOutcome[];
  dismissOutcomes: () => void;
  verify: (code: string) => Promise<CheckInResult>;
  admit: (
    code: string,
    count: number
  ) => Promise<{ result: CheckInResult; offline: boolean }>;
  search: (query: string) => Promise<{ ok: boolean; guests: CheckInMatch[] }>;
  /** Fetch a fresh copy of the guest list shortly: another phone admitted someone. */
  refreshSoon: () => void;
}

/**
 * The check-in desk, online when it can be and offline when it must. Every request goes to the
 * server first; if the network fails, the desk answers from the phone's copy of the guest list and
 * queues the admission. The queue is sent, in order, as soon as the signal is back.
 */
export function useOfflineDesk(
  eventId: string,
  onSynced?: () => void
): OfflineDesk {
  const [online, setOnline] = useState(true);
  const [snapshot, setSnapshot] = useState<CheckInSnapshot | null>(null);
  const [queue, setQueue] = useState<QueuedAdmission[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [outcomes, setOutcomes] = useState<SyncOutcome[]>([]);
  const queueRef = useRef<QueuedAdmission[]>([]);
  const snapRef = useRef<CheckInSnapshot | null>(null);
  const syncingRef = useRef(false);
  const synced = useRef(onSynced);
  synced.current = onSynced;

  const setQ = useCallback(
    (next: QueuedAdmission[]) => {
      queueRef.current = next;
      setQueue(next);
      saveQueue(eventId, next);
    },
    [eventId]
  );

  const refreshList = useCallback(async () => {
    try {
      const res = await getCheckInSnapshotAction(eventId);
      if (res.ok && res.snapshot) {
        snapRef.current = res.snapshot;
        setSnapshot(res.snapshot);
        saveSnapshot(res.snapshot);
      }
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [eventId]);

  // Several admissions in a row (or a burst from other phones) cost one refresh, not one each.
  const soon = useRef<number | null>(null);
  const refreshSoon = useCallback(() => {
    if (soon.current) window.clearTimeout(soon.current);
    soon.current = window.setTimeout(() => {
      soon.current = null;
      if (navigator.onLine) void refreshList();
    }, 2500);
  }, [refreshList]);

  /** The server admitted someone from this phone: move the numbers now, confirm with a refresh. */
  const noteAdmitted = useCallback(
    (result: CheckInResult) => {
      if (
        result.status !== "checked_in" ||
        !result.guest_id ||
        !snapRef.current
      )
        return;
      const next = withAdmitted(
        snapRef.current,
        result.guest_id,
        result.admitted_now ?? 1,
        new Date().toISOString()
      );
      snapRef.current = next;
      setSnapshot(next);
      saveSnapshot(next);
      refreshSoon();
    },
    [refreshSoon]
  );

  const sync = useCallback(async () => {
    if (syncingRef.current || queueRef.current.length === 0) return;
    syncingRef.current = true;
    setSyncing(true);
    const found: SyncOutcome[] = [];
    try {
      while (queueRef.current.length > 0) {
        const next = queueRef.current[0];
        let res;
        try {
          res = await performCheckInAction(eventId, {
            code: next.code,
            count: next.count,
          });
        } catch {
          setOnline(false);
          break;
        }
        setOnline(true);
        if (!res.ok && needsSignIn(res.error)) break;
        const outcome =
          res.ok && res.result
            ? outcomeOf(next, res.result)
            : ({
                kind: "refused",
                admission: next,
                reason: res.error ?? "The server did not accept it",
              } as SyncOutcome);
        if (outcome.kind !== "admitted") found.push(outcome);
        setQ(queueRef.current.slice(1));
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      if (found.length) setOutcomes((o) => [...o, ...found]);
    }
    if (queueRef.current.length === 0) {
      await refreshList();
      synced.current?.();
    }
  }, [eventId, refreshList, setQ]);

  // On arrival: this phone's saved copy and queue, then a fresh copy if there is a signal.
  useEffect(() => {
    wipeExpired();
    const s = loadSnapshot(eventId);
    snapRef.current = s;
    setSnapshot(s);
    const q = loadQueue(eventId);
    queueRef.current = q;
    setQueue(q);
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    void refreshList().then(() => void sync());
  }, [eventId, refreshList, sync]);

  // Back online: send the queue. While online: keep the copy fresh.
  useEffect(() => {
    const up = () => {
      setOnline(true);
      void sync();
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const id = window.setInterval(() => {
      if (navigator.onLine) void refreshList().then(() => void sync());
    }, REFRESH_MS);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      window.clearInterval(id);
    };
  }, [refreshList, sync]);

  const verify = useCallback(
    async (code: string): Promise<CheckInResult> => {
      // With admissions still waiting to be sent, the server does not know about them yet: answer
      // from the phone so a guest let in offline is not offered again.
      if (navigator.onLine && queueRef.current.length === 0) {
        try {
          const res = await verifyCheckInAction(eventId, code);
          setOnline(true);
          return res.ok && res.result
            ? res.result
            : {
                status: "unknown_code",
                message: res.error || "Could not verify that pass",
              };
        } catch {
          setOnline(false);
        }
      }
      return snapRef.current
        ? verifyOffline(snapRef.current, queueRef.current, code)
        : noList;
    },
    [eventId]
  );

  const admitLocally = useCallback(
    (code: string, count: number) => {
      if (!snapRef.current) return { result: noList, offline: true };
      const { result, admission } = admitOffline(
        snapRef.current,
        queueRef.current,
        code,
        count,
        new Date().toISOString(),
        newId()
      );
      if (admission) setQ([...queueRef.current, admission]);
      return { result, offline: true };
    },
    [setQ]
  );

  const admit = useCallback(
    async (code: string, count: number) => {
      if (navigator.onLine && queueRef.current.length === 0) {
        try {
          const res = await performCheckInAction(eventId, { code, count });
          setOnline(true);
          if (res.ok && res.result) noteAdmitted(res.result);
          return {
            result:
              res.ok && res.result
                ? res.result
                : ({
                    status: "unknown_code",
                    message: res.error || "Failed to process check-in",
                  } as CheckInResult),
            offline: false,
          };
        } catch {
          setOnline(false);
        }
      }
      const out = admitLocally(code, count);
      if (navigator.onLine) void sync();
      return out;
    },
    [eventId, admitLocally, sync, noteAdmitted]
  );

  const search = useCallback(
    async (query: string) => {
      if (navigator.onLine) {
        try {
          const res = await searchCheckInGuestsAction(eventId, query);
          setOnline(true);
          if (queueRef.current.length === 0 || !snapRef.current) return res;
        } catch {
          setOnline(false);
        }
      }
      return snapRef.current
        ? {
            ok: true,
            guests: searchOffline(snapRef.current, queueRef.current, query),
          }
        : { ok: false, guests: [] };
    },
    [eventId]
  );

  return {
    online,
    snapshot,
    queue,
    syncing,
    outcomes,
    dismissOutcomes: () => setOutcomes([]),
    verify,
    admit,
    search,
    refreshSoon,
  };
}
