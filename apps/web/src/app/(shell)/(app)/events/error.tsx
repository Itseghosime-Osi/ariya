"use client";

import React, { useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { ERROR_PRIMARY, ErrorScreen } from "@/components/errors/error-screen";

export default function EventsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[EventsError] Failed to load events:", error);
  }, [error]);

  return (
    <ErrorScreen
      layout="page"
      alert
      testId="events-error-state"
      eyebrow="Connection interrupted"
      title="We couldn't load your events"
      message="A temporary connection issue interrupted loading your celebrations. Your guest lists and RSVPs are safe."
      reference={error.digest}
      actions={
        <button type="button" onClick={() => reset()} className={ERROR_PRIMARY}>
          <Icon name="refresh" size={16} />
          Retry
        </button>
      }
    />
  );
}
