"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLatestInvitationStateAction } from "../../live-sync-actions";
import type { InvitationDesign } from "../../types";

/** How often the studio re-reads the save while realtime is not subscribed. */
const POLL_MS = 3000;

/**
 * The slice of the document the live sync drives. A plain interface (not the whole hook return)
 * so the realtime channel can hold it in a ref and never resubscribe while the host types.
 */
export interface AiLiveSyncDoc {
  design: InvitationDesign;
  isDirty: boolean;
  getRevision: () => string | undefined;
  applyRemoteDesign: (
    next: InvitationDesign,
    revision: string,
    label: string
  ) => void;
  noteRemoteDesign: (
    next: InvitationDesign,
    revision: string,
    label: string
  ) => void;
  adoptRevision: (revision: string) => void;
  flushSave: () => Promise<boolean>;
}

export interface AiConflict {
  /** The short human summary from the AI change's own backup row, when one was found. */
  summary: string | null;
}

/**
 * B1, B2, B4, B6: hears about a design saved elsewhere (a connected AI, another tab) and brings
 * it onto the open canvas. Realtime on the event row first; while it is not subscribed, the save
 * is re-read every few seconds; when the connection returns, it is re-read at once.
 *
 * Clean canvas: the change applies as one undo step labelled "AI: <summary>" (B2), with a short
 * notice for screen readers (B4). Unsaved host edits: a conflict banner goes up instead (B3) —
 * applying keeps the host's edits as the step below, keeping theirs files the AI design as the
 * step below, so neither choice can lose work.
 */
export function useAiLiveSync(
  eventId: string,
  getDoc: () => AiLiveSyncDoc | null,
  onNotice: (text: string) => void
): {
  conflict: AiConflict | null;
  applyConflict: () => void;
  keepConflict: () => void;
} {
  const [conflict, setConflict] = useState<AiConflict | null>(null);
  const noticeRef = useRef(onNotice);
  noticeRef.current = onNotice;
  const getRef = useRef(getDoc);
  getRef.current = getDoc;
  const pendingRef = useRef<{
    design: InvitationDesign;
    revision: string;
    summary: string | null;
  } | null>(null);
  /** Revisions already brought onto the canvas or consciously left alone. */
  const handledRef = useRef<string | null>(null);
  const realtimeRef = useRef(false);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const checkForRemoteChange = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      // Offline the server action itself rejects; that is an answer ("not now"), not a crash.
      let state: Awaited<ReturnType<typeof getLatestInvitationStateAction>>;
      try {
        state = await getLatestInvitationStateAction(eventId);
      } catch {
        return;
      }
      if (!mountedRef.current || !state.ok) return;
      const doc = getRef.current();
      if (!doc || state.revision === handledRef.current) return;
      const known = doc.getRevision();
      if (known && state.revision === known) {
        handledRef.current = state.revision;
        return;
      }
      // Same words, new stamp (a save that changed nothing visible on this canvas): track the
      // revision only, so the next host edit still carries the revision check.
      if (JSON.stringify(state.design) === JSON.stringify(doc.design)) {
        handledRef.current = state.revision;
        doc.adoptRevision(state.revision);
        pendingRef.current = null;
        setConflict((c) => (c ? null : c));
        return;
      }
      handledRef.current = state.revision;
      const summary = state.aiSummary;
      const label = `AI: ${summary ?? "changed the card"}`;
      pendingRef.current = {
        design: state.design,
        revision: state.revision,
        summary,
      };
      if (doc.isDirty) {
        if (mountedRef.current) setConflict({ summary });
        return;
      }
      pendingRef.current = null;
      doc.applyRemoteDesign(state.design, state.revision, label);
      if (!mountedRef.current) return;
      setConflict((c) => (c ? null : c));
      noticeRef.current(`Your AI ${summary ?? "changed the card"}`);
    } finally {
      fetchingRef.current = false;
    }
  }, [eventId]);

  const checkRef = useRef(checkForRemoteChange);
  checkRef.current = checkForRemoteChange;

  useEffect(() => {
    mountedRef.current = true;
    const supabase = createClient();
    const channel = supabase
      .channel(`invitation_design_${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        () => {
          void checkRef.current();
        }
      )
      .subscribe((status) => {
        realtimeRef.current = status === "SUBSCRIBED";
      });
    const poll = window.setInterval(() => {
      if (
        !realtimeRef.current &&
        document.visibilityState === "visible" &&
        navigator.onLine !== false
      )
        void checkRef.current();
    }, POLL_MS);
    // B6: whatever arrived while offline applies when the connection returns.
    const recheck = () => {
      void checkRef.current();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") recheck();
    };
    window.addEventListener("online", recheck);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mountedRef.current = false;
      window.clearInterval(poll);
      window.removeEventListener("online", recheck);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const applyConflict = useCallback(() => {
    const pending = pendingRef.current;
    const doc = getRef.current();
    if (!pending || !doc) return;
    pendingRef.current = null;
    // The host's unsaved edits become the step below, so one Undo brings them straight back.
    doc.applyRemoteDesign(
      pending.design,
      pending.revision,
      `AI: ${pending.summary ?? "changed the card"}`
    );
    if (!mountedRef.current) return;
    setConflict(null);
    noticeRef.current(
      `Applied your AI's change${pending.summary ? `: ${pending.summary}` : ""}. Undo is available.`
    );
  }, []);

  const keepConflict = useCallback(() => {
    const pending = pendingRef.current;
    const doc = getRef.current();
    if (!pending || !doc) return;
    pendingRef.current = null;
    // The AI design is filed as the step below, so one Undo reaches exactly what the AI made;
    // the remote revision is adopted so the host's own save keeps the revision check.
    doc.noteRemoteDesign(
      pending.design,
      pending.revision,
      `AI: ${pending.summary ?? "changed the card"}`
    );
    if (mountedRef.current) {
      setConflict(null);
      noticeRef.current(
        "Kept your version — your AI's change is one Undo away."
      );
    }
    void doc.flushSave();
  }, []);

  return { conflict, applyConflict, keepConflict };
}
