"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so the checklist and the run sheet open without a signal (6.4.5).
 *
 * Registration used to happen only when someone turned notifications on, which left the offline
 * cache unavailable to a host who never did. It is a no-op everywhere that matters: the worker
 * itself decides what to cache, and it caches only those two pages.
 */
export function OfflineCache() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Registering twice is harmless — the browser returns the same registration.
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => {
        // A browser that refuses the worker still loads the app online; nothing else changes.
        console.warn(
          "[OfflineCache] service worker registration failed:",
          error
        );
      });
  }, []);

  return null;
}
