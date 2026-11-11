"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveHallLayoutAction } from "../actions";
import { defaultLayout, normaliseLayout, type HallLayout } from "./model";

export type SaveState = "saved" | "saving" | "failed" | "conflict" | "local";

function revOf(doc: unknown): number {
  if (!doc || typeof doc !== "object") return 0;
  const r = (doc as { rev?: unknown }).rev;
  return typeof r === "number" && Number.isFinite(r) && r >= 0
    ? Math.floor(r)
    : 0;
}

type Positions = Record<string, { x: number; y: number }>;

interface Snapshot {
  layout: HallLayout;
  positions: Positions;
  /** What the step after this snapshot did, in the host's words, and when. */
  label: string;
  at: number;
}

/** A plain description of what changed between two halls, for the History list. */
export function describeChange(prev: HallLayout, next: HallLayout): string {
  if (prev.width !== next.width || prev.length !== next.length)
    return `Resized the room to ${next.width} × ${next.length} m`;
  if (prev.zones.length < next.zones.length) return "Added an area";
  if (prev.zones.length > next.zones.length) return "Removed an area";
  if (JSON.stringify(prev.zones) !== JSON.stringify(next.zones))
    return "Moved or resized an area";
  if (prev.seatRules.length !== next.seatRules.length)
    return prev.seatRules.length < next.seatRules.length
      ? "Added a seating rule"
      : "Removed a seating rule";
  if (JSON.stringify(prev.rotations) !== JSON.stringify(next.rotations))
    return "Turned tables";
  if (
    JSON.stringify(prev.decor) !== JSON.stringify(next.decor) ||
    JSON.stringify(prev.tableStyles) !== JSON.stringify(next.tableStyles)
  )
    return "Changed the décor";
  if (prev.chairs.length !== next.chairs.length)
    return prev.chairs.length < next.chairs.length
      ? "Added chairs"
      : "Removed chairs";
  if (JSON.stringify(prev.chairs) !== JSON.stringify(next.chairs))
    return "Moved chairs";
  if (prev.spacing !== next.spacing) return "Changed table spacing";
  if (prev.mood !== next.mood) return "Changed the light";
  if (JSON.stringify(prev.groups) !== JSON.stringify(next.groups))
    return "Grouped items";
  if (JSON.stringify(prev.layers) !== JSON.stringify(next.layers))
    return "Changed layers";
  return "Edited the hall";
}

const LOCAL_KEY = (eventId: string) => `ariya:hall:${eventId}`;

/**
 * The hall document plus an undo history that also covers table positions. Layout changes are
 * saved to the event after a short pause; when the database column is not there yet they are
 * kept on this device instead, and `storedLocally` says so.
 */
export function useHallLayout({
  eventId,
  initialLayout,
  available,
}: {
  eventId: string;
  initialLayout: unknown;
  available: boolean;
}) {
  const [layout, setLayout] = useState<HallLayout>(
    () => normaliseLayout(initialLayout) ?? defaultLayout()
  );
  const [storedLocally, setStoredLocally] = useState(!available);
  const [saving, setSaving] = useState(false);
  /**
   * What the host is told about their work: saved, saving, not saved (with a retry), or that
   * someone else saved a newer hall. `failed` and `conflict` stay until a save goes through.
   */
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [conflict, setConflict] = useState<{
    rev: number;
    layout: unknown;
  } | null>(null);
  // The revision this studio last loaded or saved; a save based on an older one is refused.
  const rev = useRef(revOf(initialLayout));
  const attempts = useRef(0);
  const retryTimer = useRef<number | null>(null);
  // The document waiting to reach the server, kept until a save succeeds so a retry can resend it.
  const unsaved = useRef<HallLayout | null>(null);
  const inFlight = useRef(false);
  const queued = useRef<{ next: HallLayout; force: boolean } | null>(null);
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const [, bump] = useState(0);
  const timer = useRef<number | null>(null);
  // The document the pause is holding, so it can be sent before the page goes away.
  const latest = useRef<HallLayout | null>(null);
  const hydrated = useRef(false);
  // The latest layout, so quick successive edits and undos never read a stale render.
  const current = useRef(layout);
  current.current = layout;
  const commit = useCallback((value: HallLayout) => {
    current.current = value;
    setLayout(value);
  }, []);

  /**
   * Send whatever the pause was waiting on. Leaving the studio for another page cancels the
   * timeout, so without this the last edit of a visit is lost — which is how a host lays out a
   * hall and then finds the checklist saying there is no plan.
   */
  const send = useCallback(
    (next: HallLayout, force = false) => {
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
      retryTimer.current = null;
      // One save at a time. A second save sent while the first is in flight would still carry the
      // old revision and be refused as a "conflict" with this studio's own earlier save, so the
      // newest document waits and goes out as soon as the first one answers.
      if (inFlight.current) {
        queued.current = {
          next,
          force: force || queued.current?.force === true,
        };
        setSaveState("saving");
        return;
      }
      inFlight.current = true;
      setSaving(true);
      setSaveState("saving");
      saveHallLayoutAction(eventId, next, force ? undefined : rev.current)
        .then((res) => {
          if (res.ok) {
            if (typeof res.data?.rev === "number") rev.current = res.data.rev;
            if (unsaved.current === next) unsaved.current = null;
            attempts.current = 0;
            setStoredLocally(false);
            setConflict(null);
            setSaveState(unsaved.current ? "saving" : "saved");
            return;
          }
          if (res.data?.fallback) {
            setStoredLocally(true);
            setSaveState("local");
            return;
          }
          if (res.data?.conflict) {
            setConflict({ rev: res.data.rev ?? 0, layout: res.data.layout });
            setSaveState("conflict");
            return;
          }
          throw new Error(res.error || "save failed");
        })
        .catch(() => {
          // The local copy is already written. Try again a few times, then wait for the host.
          setSaveState("failed");
          attempts.current += 1;
          if (attempts.current <= 3) {
            retryTimer.current = window.setTimeout(
              () => {
                if (unsaved.current) send(unsaved.current);
              },
              1000 * 2 ** attempts.current
            );
          }
        })
        .finally(() => {
          inFlight.current = false;
          setSaving(false);
          const waiting = queued.current;
          queued.current = null;
          if (waiting) send(waiting.next, waiting.force);
        });
    },
    [eventId]
  );

  /**
   * Send whatever the pause was waiting on. Leaving the studio for another page cancels the
   * timeout, so without this the last edit of a visit is lost — which is how a host lays out a
   * hall and then finds the checklist saying there is no plan.
   */
  const flush = useCallback(
    (leaving = false) => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
      const next = latest.current;
      latest.current = null;
      if (!next) return;
      unsaved.current = next;
      try {
        localStorage.setItem(LOCAL_KEY(eventId), JSON.stringify(next));
      } catch {
        /* private mode */
      }
      if (storedLocally && !available) return;
      if (leaving) {
        // The component is going away, so a server action would be torn down with it. `keepalive`
        // lets the browser finish this request after the page has moved on.
        void fetch(`/api/events/${eventId}/hall-layout`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          // While a save from this studio is still on its way, its revision is not known yet, so
          // the last edit of the visit goes without one rather than be refused by our own save.
          body: JSON.stringify(
            inFlight.current
              ? { layout: next }
              : { layout: next, baseRev: rev.current }
          ),
          keepalive: true,
        }).catch(() => {
          /* the local copy is the fallback */
        });
        return;
      }
      send(next);
    },
    [eventId, storedLocally, available, send]
  );

  /** Send the unsaved document again now. */
  const retry = useCallback(() => {
    attempts.current = 0;
    const next = unsaved.current ?? current.current;
    send(next);
  }, [send]);

  /** Someone else saved a newer hall: keep this one anyway, replacing theirs. */
  const keepMine = useCallback(() => {
    const next = unsaved.current ?? current.current;
    send(next, true);
  }, [send]);

  /** Someone else saved a newer hall: take theirs and drop the unsaved edits. */
  const takeTheirs = useCallback(() => {
    if (!conflict) return;
    const theirs = normaliseLayout(conflict.layout);
    rev.current = conflict.rev;
    unsaved.current = null;
    latest.current = null;
    if (theirs) {
      current.current = theirs;
      setLayout(theirs);
    }
    past.current = [];
    future.current = [];
    setConflict(null);
    setSaveState("saved");
    bump((n) => n + 1);
  }, [conflict]);

  // Warn before leaving while work has not reached the server.
  useEffect(() => {
    if (saveState !== "failed" && saveState !== "conflict") return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  useEffect(
    () => () => {
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
    },
    []
  );

  // A layout kept on this device wins over the empty default when the database has none.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (initialLayout) return;
    try {
      const raw = localStorage.getItem(LOCAL_KEY(eventId));
      const local = raw ? normaliseLayout(JSON.parse(raw)) : null;
      if (local) setLayout(local);
    } catch {
      /* nothing stored */
    }
  }, [eventId, initialLayout]);

  const persist = useCallback(
    (next: HallLayout) => {
      latest.current = next;
      if (saveState !== "conflict") setSaveState("saving");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 600);
    },
    [flush, saveState]
  );

  /** Record the current state so it can be undone, before making a change. */
  const remember = useCallback(
    (positions: Positions, label = "Moved tables") => {
      past.current = [
        ...past.current.slice(-49),
        { layout: current.current, positions, label, at: Date.now() },
      ];
      future.current = [];
      bump((n) => n + 1);
    },
    []
  );

  const update = useCallback(
    (
      next: HallLayout | ((l: HallLayout) => HallLayout),
      positions: Positions
    ) => {
      const prev = current.current;
      const value = typeof next === "function" ? next(prev) : next;
      past.current = [
        ...past.current.slice(-49),
        {
          layout: prev,
          positions,
          label: describeChange(prev, value),
          at: Date.now(),
        },
      ];
      future.current = [];
      commit(value);
      persist(value);
      bump((n) => n + 1);
    },
    [commit, persist]
  );

  const undo = useCallback(
    (positions: Positions): Snapshot | null => {
      const prev = past.current.pop();
      if (!prev) return null;
      future.current.push({
        layout: current.current,
        positions,
        label: prev.label,
        at: prev.at,
      });
      commit(prev.layout);
      persist(prev.layout);
      bump((n) => n + 1);
      return prev;
    },
    [commit, persist]
  );

  /**
   * Swap the layout without recording a step. Flipping between two layouts to compare them is
   * not an edit, so it must not fill the undo history with the same two states.
   */
  const replace = useCallback(
    (next: HallLayout) => {
      commit(next);
      persist(next);
      bump((n) => n + 1);
    },
    [commit, persist]
  );

  const redo = useCallback(
    (positions: Positions): Snapshot | null => {
      const next = future.current.pop();
      if (!next) return null;
      past.current.push({
        layout: current.current,
        positions,
        label: next.label,
        at: next.at,
      });
      commit(next.layout);
      persist(next.layout);
      bump((n) => n + 1);
      return next;
    },
    [commit, persist]
  );

  useEffect(() => {
    const leave = () => flush(true);
    // pagehide covers a reload or a tab close. An in-app link click does not fire it, so the
    // cleanup below is the one that matters: it runs as the studio unmounts.
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [flush]);

  return {
    layout,
    /** The latest layout, including edits made since the last render. */
    latest: current,
    update,
    replace,
    remember,
    undo,
    redo,
    canUndo: past.current.length > 0,
    /** The revision this studio last saved or loaded. */
    currentRev: () => rev.current,
    /**
     * Send any edit still waiting, and resolve once no save is in flight, so an action that
     * changes the stored hall (a share link) starts from the revision this studio really holds.
     */
    whenIdle: async () => {
      flush();
      for (let i = 0; i < 200; i++) {
        if (!inFlight.current && !queued.current && !timer.current) return;
        await new Promise((r) => setTimeout(r, 50));
      }
    },
    /** Take the revision a server action just wrote (e.g. a share link), so the next save fits. */
    adoptRev: (n: number) => {
      rev.current = n;
    },
    /** The steps that can be undone, oldest first, with what each did and when. */
    history: past.current.map((s) => ({ label: s.label, at: s.at })),
    canRedo: future.current.length > 0,
    storedLocally,
    saving,
    saveState,
    conflict: conflict !== null,
    retry,
    keepMine,
    takeTheirs,
  };
}
