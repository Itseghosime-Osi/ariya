"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveInvitationDesignAction } from "../../actions";
import type { InvitationDesign } from "../../types";

const SAVE_DELAY_MS = 700;

interface Doc {
  past: InvitationDesign[];
  present: InvitationDesign;
  future: InvitationDesign[];
}

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * The designer's one document: every edit goes through `commit`, can be undone, and saves itself
 * a moment after the last change. There is no save button to forget.
 */
export function useDesignerDoc(eventId: string, initial: InvitationDesign) {
  const [doc, setDoc] = useState<Doc>({
    past: [],
    present: initial,
    future: [],
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedRef = useRef(JSON.stringify(initial));
  const latestRef = useRef(savedRef.current);

  /** `record: false` is for the frames of a drag; the gesture is recorded once when it ends. */
  const commit = useCallback(
    (
      next: InvitationDesign | ((d: InvitationDesign) => InvitationDesign),
      record = true
    ) => {
      setDoc((s) => {
        const updated = typeof next === "function" ? next(s.present) : next;
        if (updated === s.present) return s;
        return record
          ? { past: [...s.past, s.present], present: updated, future: [] }
          : { ...s, present: updated };
      });
    },
    []
  );

  const recordSnapshot = useCallback((snapshot: InvitationDesign) => {
    setDoc((s) => ({
      past: [...s.past, snapshot],
      present: s.present,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setDoc((s) =>
      s.past.length
        ? {
            past: s.past.slice(0, -1),
            present: s.past[s.past.length - 1],
            future: [s.present, ...s.future],
          }
        : s
    );
  }, []);

  const redo = useCallback(() => {
    setDoc((s) =>
      s.future.length
        ? {
            past: [...s.past, s.present],
            present: s.future[0],
            future: s.future.slice(1),
          }
        : s
    );
  }, []);

  useEffect(() => {
    const serialised = JSON.stringify(doc.present);
    latestRef.current = serialised;
    if (serialised === savedRef.current) return;
    setSaveState("saving");
    const timer = setTimeout(async () => {
      const result = await saveInvitationDesignAction(eventId, doc.present);
      if (latestRef.current !== serialised) return;
      if (result.ok) {
        savedRef.current = serialised;
        setSaveState("saved");
        setSaveError(null);
      } else {
        setSaveState("error");
        setSaveError(result.error);
      }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [doc.present, eventId]);

  return {
    design: doc.present,
    commit,
    recordSnapshot,
    undo,
    redo,
    canUndo: doc.past.length > 0,
    canRedo: doc.future.length > 0,
    saveState,
    saveError,
  };
}
