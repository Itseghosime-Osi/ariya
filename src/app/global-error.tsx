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
      <body className="min-h-screen bg-[#f4efe6] text-[#1d1c16] flex flex-col items-center justify-center p-6 text-center font-sans">
        <h1 className="text-3xl font-semibold text-[#4e0013] mb-2">
          Application Error
        </h1>
        <p className="text-[#564243] max-w-md mb-6 text-sm">
          A critical error occurred. Please refresh or try again.
        </p>
        <Button onClick={() => reset()} variant="primary">
          Reload application
        </Button>
      </body>
    </html>
  );
}
