"use client";

import { useEffect, useState } from "react";
import type { StudioEngine } from "@ariya/studio";

export type StudioStatus = "loading" | "ready" | "unavailable";

/**
 * Loads the Rust studio core for the seating route, and says whether it arrived.
 *
 * The import is dynamic so the loader never reaches a chunk that is not the studio, and the
 * artifact is fetched at runtime. A failure is not an error the user sees: the caller keeps its
 * TypeScript path and hides the features that need Rust.
 */
export function useStudioEngine(): {
  engine: StudioEngine | null;
  status: StudioStatus;
} {
  const [engine, setEngine] = useState<StudioEngine | null>(null);
  const [status, setStatus] = useState<StudioStatus>("loading");

  useEffect(() => {
    let alive = true;
    import("@ariya/studio")
      .then((studio) => studio.loadStudio())
      .then((loaded) => {
        if (!alive) return;
        setEngine(loaded);
        setStatus(loaded ? "ready" : "unavailable");
      })
      .catch(() => {
        if (alive) setStatus("unavailable");
      });
    return () => {
      alive = false;
    };
  }, []);

  return { engine, status };
}
