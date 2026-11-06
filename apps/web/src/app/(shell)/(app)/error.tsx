"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import {
  ERROR_PRIMARY,
  ERROR_SECONDARY,
  ErrorScreen,
} from "@/components/errors/error-screen";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError] Caught application error:", error);
  }, [error]);

  return (
    <ErrorScreen
      layout="inline"
      alert
      eyebrow="Workspace interrupted"
      title="This section hit a snag"
      message="Your guest list, replies and plans are safe. Try loading it again, or go back to your celebrations."
      reference={error.digest}
      actions={
        <>
          <button
            type="button"
            onClick={() => reset()}
            className={ERROR_PRIMARY}
          >
            Try again
          </button>
          <Link href="/events" className={ERROR_SECONDARY}>
            My celebrations
          </Link>
        </>
      }
    />
  );
}
