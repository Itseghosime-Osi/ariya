import React from "react";
import Link from "next/link";

export default function PublicEventNotFound() {
  return (
    <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-secondary-container/50 border border-outline-variant/40 flex items-center justify-center text-wine text-2xl font-serif mb-4 shadow-sm">
        À
      </div>
      <h1 className="font-serif text-3xl font-bold text-night mb-2">
        Celebration Unavailable
      </h1>
      <p className="text-sm text-on-surface-variant max-w-md mb-6">
        This celebration page is private, unpublished, or has concluded.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-2xl bg-wine text-ivory text-xs font-semibold hover:bg-wine/90 transition-all shadow-md"
      >
        Return to Àríyá
      </Link>
    </div>
  );
}
