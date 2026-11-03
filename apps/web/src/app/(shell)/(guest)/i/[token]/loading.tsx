import React from "react";
import { Icon } from "@/components/ui/icon";

export default function GuestRsvpLoading() {
  return (
    <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="w-14 h-14 rounded-2xl bg-secondary-container/60 border border-outline-variant/40 flex items-center justify-center text-wine text-2xl font-serif mb-4 shadow-sm">
        À
      </div>
      <div className="flex items-center gap-2 text-xs font-medium text-stone-700">
        <Icon name="refresh" className="animate-spin text-base text-wine" />
        <span>Preparing your royal invitation...</span>
      </div>
    </div>
  );
}
