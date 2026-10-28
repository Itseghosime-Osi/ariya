"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-error-container/40 flex items-center justify-center text-error text-2xl font-display mb-4">
        !
      </div>
      <h1 className="font-display text-3xl font-semibold text-primary mb-2">
        Something went wrong
      </h1>
      <p className="text-on-surface-variant max-w-md mb-6 text-sm">
        We encountered an unexpected error while loading this page. Please try
        again.
      </p>
      <Button onClick={() => reset()} variant="primary">
        Try again
      </Button>
    </div>
  );
}
