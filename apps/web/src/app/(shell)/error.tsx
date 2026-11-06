"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ERROR_PRIMARY,
  ERROR_SECONDARY,
  ErrorScreen,
} from "@/components/errors/error-screen";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      alert
      eyebrow="Something went wrong"
      title="We hit a snag"
      message="Nothing you saved was lost. Try again, and if it keeps happening, quote the reference below when you ask for help."
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
          <Link href="/" className={ERROR_SECONDARY}>
            Back to home
          </Link>
        </>
      }
    />
  );
}
