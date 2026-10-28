"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
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
    <html lang="en">
      <body className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center p-6 text-center font-sans">
        <h1 className="text-3xl font-semibold text-primary mb-2">
          Application Error
        </h1>
        <p className="text-on-surface-variant max-w-md mb-6 text-sm">
          A critical error occurred. Please refresh or try again.
        </p>
        <Button onClick={() => reset()} variant="primary">
          Reload application
        </Button>
      </body>
    </html>
  );
}
