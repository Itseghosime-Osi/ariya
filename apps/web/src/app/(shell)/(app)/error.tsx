"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

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
    <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-4 shadow-xs">
        <Icon name="error" className="text-2xl text-red-600" />
      </div>
      <h2 className="font-serif text-2xl font-bold text-night mb-2">
        Celebration Workspace Interrupted
      </h2>
      <p className="text-xs text-on-surface-variant max-w-md mb-6">
        An error occurred while loading this celebration section. Your data
        remains safe and secured.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl bg-wine text-ivory text-xs font-semibold hover:bg-wine/90 transition-all shadow-sm"
        >
          Try Again
        </button>
        <Link
          href="/events"
          className="px-5 py-2.5 rounded-xl border border-outline-variant/60 text-xs font-medium text-stone-700 hover:text-night hover:border-outline"
        >
          My Celebrations
        </Link>
      </div>
    </div>
  );
}
