"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveHallLayoutAction } from "../actions";
import { defaultLayout, normaliseLayout, type HallLayout } from "./model";

type Positions = Record<string, { x: number; y: number }>;

interface Snapshot {
  layout: HallLayout;
  positions: Positions;
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
  const flush = useCallback(
    (leaving = false) => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
      const next = latest.current;
      latest.current = null;
      if (!next) return;
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
          body: JSON.stringify(next),
          keepalive: true,
        }).catch(() => {
          /* the local copy is the fallback */
        });
        return;
      }
      setSaving(true);
      void saveHallLayoutAction(eventId, next).then((res) => {
        setSaving(false);
        if (!res.ok && res.data?.fallback) setStoredLocally(true);
        else if (res.ok) setStoredLocally(false);
      });
    },
    [eventId, storedLocally, available]
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
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 600);
    },
    [flush]
  );

  /** Record the current state so it can be undone, before making a change. */
  const remember = useCallback((positions: Positions) => {
    past.current = [
      ...past.current.slice(-49),
      { layout: current.current, positions },
    ];
    future.current = [];
    bump((n) => n + 1);
  }, []);

  const update = useCallback(
    (
      next: HallLayout | ((l: HallLayout) => HallLayout),
      positions: Positions
    ) => {
      const prev = current.current;
      const value = typeof next === "function" ? next(prev) : next;
      past.current = [...past.current.slice(-49), { layout: prev, positions }];
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
      future.current.push({ layout: current.current, positions });
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
      past.current.push({ layout: current.current, positions });
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
    update,
    replace,
    remember,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    storedLocally,
    saving,
  };
}
