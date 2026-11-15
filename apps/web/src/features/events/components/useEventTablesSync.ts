"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getEventTablesFingerprintAction } from "@/features/invitations/live-sync-actions";

/** How often a page re-reads its tables while realtime is not subscribed. */
const POLL_MS = 5000;

/**
 * B5: the same live update for the guest list, seating and RSVPs where the AI writes today.
 * Realtime on the event's tables first (guests carry their RSVPs; seat assignments ride with
 * the seating desk's own query); while it is not subscribed, the tables' stamps are re-read
 * every few seconds; when the connection returns, they are re-read at once. Any stamp the AI
 * moved refreshes the page's server data without a reload. Offline changes apply when the
 * connection returns (B6).
 */
export function useEventTablesSync(eventId: string): void {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const knownRef = useRef<string | null>(null);
  const realtimeRef = useRef(false);
  const fetchingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const fingerprint = async (): Promise<string | null> => {
      if (fetchingRef.current) return null;
      fetchingRef.current = true;
      try {
        let state: Awaited<ReturnType<typeof getEventTablesFingerprintAction>>;
        try {
          state = await getEventTablesFingerprintAction(eventId);
        } catch {
          return null;
        }
        if (!mounted || !state.ok) return null;
        return [state.eventsRev, state.guestsRev, state.tablesRev].join("|");
      } finally {
        fetchingRef.current = false;
      }
    };

    const check = async () => {
      const stamp = await fingerprint();
      if (!mounted || stamp === null) return;
      if (knownRef.current === null) {
        knownRef.current = stamp;
        return;
      }
      if (stamp !== knownRef.current) {
        knownRef.current = stamp;
        routerRef.current.refresh();
      }
    };

    void check();

    const supabase = createClient();
    const channel = supabase
      .channel(`event_tables_${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guests",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          void check();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tables",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          void check();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seat_assignments" },
        () => {
          void check();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps" },
        () => {
          void check();
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
        void check();
    }, POLL_MS);

    const recheck = () => {
      void check();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") recheck();
    };
    window.addEventListener("online", recheck);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted = false;
      window.clearInterval(poll);
      window.removeEventListener("online", recheck);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [eventId]);
}
