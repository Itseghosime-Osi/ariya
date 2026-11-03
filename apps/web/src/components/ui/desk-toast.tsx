"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "./icon";

/**
 * A quiet confirmation for small actions (copied a link, saved a change). Announced politely and
 * gone on its own; the action itself already happened, so nothing depends on the toast.
 */
export function useDeskToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), 2800);
    return () => window.clearTimeout(id);
  }, [message]);

  const showToast = useCallback((next: string) => setMessage(next), []);

  const toast = (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4 sm:bottom-8"
    >
      {message ? (
        <div className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-night shadow-lg">
          <Icon name="check_circle" size={16} className="text-rsvp-accepted" />
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  );

  return { showToast, toast };
}
