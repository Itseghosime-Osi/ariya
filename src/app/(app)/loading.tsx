import React from "react";
import { Icon } from "@/components/ui/icon";

export default function AppLoading() {
  return (
    <div className="w-full py-16 flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
      <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-wine mb-3">
        <Icon name="refresh" className="animate-spin text-xl text-wine" />
      </div>
      <p className="text-xs font-medium text-on-surface-variant">
        Retrieving celebration workspace...
      </p>
    </div>
  );
}
