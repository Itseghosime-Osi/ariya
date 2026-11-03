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
  const hydrated = useRef(false);
  // The latest layout, so quick successive edits and undos never read a stale render.
  const current = useRef(layout);
  current.current = layout;
  const commit = useCallback((value: HallLayout) => {
    current.current = value;
    setLayout(value);
  }, []);

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
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        try {
          localStorage.setItem(LOCAL_KEY(eventId), JSON.stringify(next));
        } catch {
          /* private mode */
        }
        if (storedLocally && !available) return;
        setSaving(true);
        const res = await saveHallLayoutAction(eventId, next);
        setSaving(false);
        if (!res.ok && res.data?.fallback) setStoredLocally(true);
        else if (res.ok) setStoredLocally(false);
      }, 600);
    },
    [eventId, storedLocally, available]
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

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  return {
    layout,
    update,
    remember,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    storedLocally,
    saving,
  };
}
