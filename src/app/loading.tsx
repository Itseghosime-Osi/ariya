import React from "react";
import { Icon } from "@/components/ui/icon";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
      <div className="w-14 h-14 rounded-2xl bg-secondary-container/50 border border-outline-variant/40 flex items-center justify-center text-wine text-2xl font-display mb-4 shadow-sm">
        À
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
        <Icon
          name="progress_activity"
          className="animate-spin text-base text-wine"
        />
        <span>Loading celebration suite...</span>
      </div>
    </div>
  );
}
