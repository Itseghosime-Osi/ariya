"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveInvitationDesignAction } from "../../actions";
import { constrainEntrySealsFast } from "../../engine";
import { constrainEntrySeals } from "../../pass-layout";
import { normaliseDesign } from "../../design";
import type { InvitationDesign } from "../../types";

const SAVE_DELAY_MS = 700;
const MAX_UNDO_STEPS = 50;

interface Doc {
  past: InvitationDesign[];
  present: InvitationDesign;
  future: InvitationDesign[];
  /**
   * Parallel to [...past, present, ...future]: how each step reached the canvas, or null for the
   * host's own edits. Index 0 is always null. Undo, redo and restore only repartition the timeline,
   * so labels travel with their entries untouched.
   */
  labels: (string | null)[];
}

export type SaveState = "idle" | "saving" | "saved" | "error";

/** The server answered and said no (conflict, invalid design): retrying the same write cannot help. */
class SaveRejected extends Error {}

/** Waits between automatic retries after a network failure: 2s, 4s, 8s, 16s, then every 30s. */
const RETRY_DELAYS_MS = [2000, 4000, 8000, 16000, 30000];

/**
 * The designer's one document: every edit goes through `commit`, can be undone, and saves itself
 * a moment after the last change. There is no save button to forget.
 */
export function useDesignerDoc(
  eventId: string,
  initial: InvitationDesign,
  initialRevision?: string
) {
  const recoveryKey = `ariya:invitation-draft:${eventId}`;
  const revisionRef = useRef(initialRevision);
  const [recovered] = useState(() => {
    try {
      const raw = localStorage.getItem(recoveryKey);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (
        draft.base !== JSON.stringify(initial) ||
        draft.revision !== initialRevision
      )
        return null;
      return normaliseDesign(draft.design);
    } catch {
      return null;
    }
  });
  const [doc, setDoc] = useState<Doc>({
    past: [],
    present: constrainEntrySeals(recovered ?? initial),
    future: [],
    labels: [null],
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedRef = useRef(JSON.stringify(initial));
  const latestRef = useRef(initial);
  latestRef.current = doc.present;
  const mountedRef = useRef(true);
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const retryRef = useRef<{ timer: number | null; attempt: number }>({
    timer: null,
    attempt: 0,
  });
  const flushRef = useRef<() => Promise<boolean>>(async () => true);

  /** `record: false` is for the frames of a drag; the gesture is recorded once when it ends. */
  const commit = useCallback(
    (
      next: InvitationDesign | ((d: InvitationDesign) => InvitationDesign),
      record = true
    ) => {
      setDoc((s) => {
        const candidate = typeof next === "function" ? next(s.present) : next;
        if (candidate === s.present) return s;
        const updated = constrainEntrySealsFast(candidate);
        if (!record) return { ...s, present: updated };
        // The pushed entry keeps the label the present carries; the dropped redo branch takes
        // its labels with it, so the array always parallels [...past, present, ...future].
        const pastLabels = s.labels
          .slice(0, s.past.length)
          .slice(-(MAX_UNDO_STEPS - 1));
        const presentLabel = s.labels[s.past.length] ?? null;
        return {
          past: [...s.past.slice(-(MAX_UNDO_STEPS - 1)), s.present],
          present: updated,
          future: [],
          labels: [...pastLabels, presentLabel, null],
        };
      });
    },
    []
  );

  const recordSnapshot = useCallback((snapshot: InvitationDesign) => {
    setDoc((s) => {
      // The filed snapshot is a host-side state (label null); the present keeps its label.
      const pastLabels = s.labels
        .slice(0, s.past.length)
        .slice(-(MAX_UNDO_STEPS - 1));
      const presentLabel = s.labels[s.past.length] ?? null;
      return {
        past: [...s.past.slice(-(MAX_UNDO_STEPS - 1)), snapshot],
        present: s.present,
        future: [],
        labels: [...pastLabels, null, presentLabel],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setDoc((s) =>
      s.past.length
        ? {
            past: s.past.slice(0, -1),
            present: s.past[s.past.length - 1],
            future: [s.present, ...s.future],
            labels: s.labels,
          }
        : s
    );
  }, []);

  const redo = useCallback(() => {
    setDoc((s) =>
      s.future.length
        ? {
            past: [...s.past.slice(-(MAX_UNDO_STEPS - 1)), s.present],
            present: s.future[0],
            future: s.future.slice(1),
            labels: s.labels,
          }
        : s
    );
  }, []);

  const restoreState = useCallback((target: InvitationDesign) => {
    setDoc((s) => {
      if (s.present === target) return s;
      const all = [...s.past, s.present, ...s.future];
      const targetIdx = all.findIndex((d) => d === target);
      if (targetIdx === -1) {
        const pastLabels = s.labels
          .slice(0, s.past.length)
          .slice(-(MAX_UNDO_STEPS - 1));
        const presentLabel = s.labels[s.past.length] ?? null;
        return {
          past: [...s.past.slice(-(MAX_UNDO_STEPS - 1)), s.present],
          present: target,
          future: [],
          labels: [...pastLabels, presentLabel, null],
        };
      }
      return {
        past: all.slice(0, targetIdx),
        present: all[targetIdx],
        future: all.slice(targetIdx + 1),
        labels: s.labels,
      };
    });
  }, []);

  /**
   * A design that arrived from elsewhere (the AI, through realtime or polling): one undo step
   * back to exactly this moment, labelled "AI: <summary>". Only called when nothing is unsaved,
   * so the step below the AI change always matches the server. Sets the revision the save would
   * have returned, marks the step clean, and drops any pending conflict: the server's copy and
   * this one agree again.
   */
  const applyRemoteDesign = useCallback(
    (next: InvitationDesign, revision: string, label: string) => {
      const updated = constrainEntrySeals(normaliseDesign(next) ?? next);
      setDoc((s) => {
        const pastLabels = s.labels
          .slice(0, s.past.length)
          .slice(-(MAX_UNDO_STEPS - 1));
        const presentLabel = s.labels[s.past.length] ?? null;
        return {
          past: [...s.past.slice(-(MAX_UNDO_STEPS - 1)), s.present],
          present: updated,
          future: [],
          labels: [...pastLabels, presentLabel, label],
        };
      });
      revisionRef.current = revision;
      savedRef.current = JSON.stringify(updated);
      try {
        localStorage.removeItem(recoveryKey);
      } catch {
        /* Storage is optional; the server remains authoritative. */
      }
      setSaveState("saved");
      setSaveError(null);
    },
    [recoveryKey]
  );

  /**
   * "Keep mine" for a conflict: the host's unsaved edits stay on the canvas and keep saving as
   * usual, but the AI design is filed as the step below the present — one Undo reaches exactly
   * what the AI made, so nothing the AI did is lost. The remote revision is adopted so the next
   * save still carries the revision check instead of racing the AI's write.
   */
  const noteRemoteDesign = useCallback(
    (next: InvitationDesign, revision: string, label: string) => {
      const updated = constrainEntrySeals(normaliseDesign(next) ?? next);
      setDoc((s) => {
        const pastLabels = s.labels
          .slice(0, s.past.length)
          .slice(-(MAX_UNDO_STEPS - 1));
        const presentLabel = s.labels[s.past.length] ?? null;
        return {
          past: [...s.past.slice(-(MAX_UNDO_STEPS - 1)), updated],
          present: s.present,
          future: [],
          labels: [...pastLabels, label, presentLabel],
        };
      });
      revisionRef.current = revision;
      if (mountedRef.current) setSaveState("saved");
    },
    []
  );

  /** After noticing a remote save whose design cannot change this view, still track its revision. */
  const adoptRevision = useCallback((revision: string) => {
    revisionRef.current = revision;
  }, []);

  /** The revision the next serialized write will check against. */
  const getRevision = useCallback(() => revisionRef.current, []);

  // Serialize writes: a slow older request must never overwrite a newer design.
  const flushSave = useCallback((): Promise<boolean> => {
    if (inFlightRef.current) return inFlightRef.current;
    const task = async () => {
      while (JSON.stringify(latestRef.current) !== savedRef.current) {
        const snapshot = latestRef.current;
        const serialised = JSON.stringify(snapshot);
        if (mountedRef.current) setSaveState("saving");
        try {
          const result = await saveInvitationDesignAction(
            eventId,
            snapshot,
            revisionRef.current
          );
          if (!result.ok) throw new SaveRejected(result.error);
          savedRef.current = serialised;
          if (result.revision) revisionRef.current = result.revision;
          try {
            if (JSON.stringify(latestRef.current) === serialised)
              localStorage.removeItem(recoveryKey);
            else
              localStorage.setItem(
                recoveryKey,
                JSON.stringify({
                  base: savedRef.current,
                  revision: revisionRef.current,
                  design: latestRef.current,
                })
              );
          } catch {
            /* Storage is optional; server remains authoritative. */
          }
        } catch (error) {
          try {
            localStorage.setItem(
              recoveryKey,
              JSON.stringify({
                base: savedRef.current,
                revision: revisionRef.current,
                design: latestRef.current,
              })
            );
          } catch {
            /* Keep the in-memory document editable. */
          }
          // A dropped connection is retried by itself; a refusal from the server is not.
          if (!(error instanceof SaveRejected) && mountedRef.current) {
            const state = retryRef.current;
            const delay =
              RETRY_DELAYS_MS[
                Math.min(state.attempt, RETRY_DELAYS_MS.length - 1)
              ];
            state.attempt += 1;
            if (state.timer) window.clearTimeout(state.timer);
            state.timer = window.setTimeout(() => {
              state.timer = null;
              void flushRef.current();
            }, delay);
          }
          if (mountedRef.current) {
            setSaveState("error");
            setSaveError(
              error instanceof Error
                ? error.message
                : "Your changes could not be saved. Please retry."
            );
          }
          return false;
        }
      }
      retryRef.current.attempt = 0;
      if (retryRef.current.timer) {
        window.clearTimeout(retryRef.current.timer);
        retryRef.current.timer = null;
      }
      if (mountedRef.current) {
        setSaveState("saved");
        setSaveError(null);
      }
      return true;
    };
    const pending = task().finally(() => {
      inFlightRef.current = null;
    });
    inFlightRef.current = pending;
    return pending;
  }, [eventId, recoveryKey]);

  flushRef.current = flushSave;

  // Back online: save what was queued while the connection was down, straight away.
  useEffect(() => {
    const resume = () => {
      retryRef.current.attempt = 0;
      if (JSON.stringify(latestRef.current) !== savedRef.current)
        void flushRef.current();
    };
    window.addEventListener("online", resume);
    return () => {
      window.removeEventListener("online", resume);
      if (retryRef.current.timer) window.clearTimeout(retryRef.current.timer);
    };
  }, []);

  useEffect(() => {
    const dirty = JSON.stringify(doc.present) !== savedRef.current;
    if (!dirty) return;
    try {
      localStorage.setItem(
        recoveryKey,
        JSON.stringify({
          base: savedRef.current,
          revision: revisionRef.current,
          design: doc.present,
        })
      );
    } catch {
      /* Private mode/full storage must not prevent server saves. */
    }
    setSaveState("saving");
    const timer = setTimeout(() => {
      void flushSave();
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [doc.present, flushSave, recoveryKey]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void flushSave();
    };
  }, [flushSave]);

  const retrySave = useCallback(() => {
    void flushSave();
  }, [flushSave]);

  // Warn before closing if there are unsaved changes pending in the save queue
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(latestRef.current) !== savedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return {
    recovered: Boolean(recovered),
    design: doc.present,
    commit,
    recordSnapshot,
    undo,
    redo,
    canUndo: doc.past.length > 0,
    canRedo: doc.future.length > 0,
    saveState,
    saveError,
    retrySave,
    flushSave,
    isDirty: JSON.stringify(doc.present) !== savedRef.current,
    past: doc.past,
    future: doc.future,
    restoreState,
    stepLabels: doc.labels,
    applyRemoteDesign,
    noteRemoteDesign,
    adoptRevision,
    getRevision,
  };
}
